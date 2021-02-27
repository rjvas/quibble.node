var Play = require('./play').Play;
var Player = require('./player').Player;
var Tile = require ('./tile').Tile;
var Word = require ('./word').Word;

const BLANK_TILE = " ";

/*
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GameSchema = new Schema(
  {
    name: {type: String, required: true, maxlength: 100},
    default_name: {type: String, required: true, maxlength: 100},
    date_create: {type: Date},
    date_last_played: {type: Date},
    plays: [type: Schema.Types.ObjectId, ref: 'Play', required: true}]
  }
);

// Virtual for game's date name
GameSchema
.virtual('name_date')
.get(function () {
  return this.name + ' : ' + this.date_last_played;
});

// Virtual for author's URL
GameSchema
.virtual('url')
.get(function () {
  return '/game/' + this._id;
});

//Export model
module.exports = mongoose.model('Game', GameSchema);
*/

class Game {
  constructor (id, name) {
    if (id) {
      this.id = id;
      Game.current_id = Math.max(id, Game.current_id);
    }
    else {
      this.id = ++Game.current_id;
    }
    Tile.init_Tile();
    Word.release_all_words();

    this.player_1 = new Player(0, "Player 1", "rgba(255, 99, 121, 0.3)", "rgba(255, 99, 121, 1)", 0);
    this.player_1_play = new Play(0, this.player_1);
    this.player_1.update_hand(true, this.player_1_play);

    this.player_2 = new Player(0, "Player 2", "rgba(121, 99, 255, 0.3)", "rgba(121, 99, 255, 1)", 0);
    this.player_2_play = new Play(0, this.player_2);
    this.player_2.update_hand(true, this.player_2_play);

    this.plays = [];
    this.default_name = "Game " + this.id;
    name ? this.name = name : this.name = this.default_name;
    this.name_time = this.name + ":" + Date.now();

    Game.current_game = this;
    Game.current_play = this.player_1_play;
    Game.current_player = this.player_1;
    Game.current_play.player = this.player_1;
  }

  set_name(new_name) {
    this.name = new_name;
  }
  set_player_1(player) {
    this.player_1 = player;
  }
  set_player_2(player) {
    this.player_2 = player;
  }

  roll_back_current_play() {
    let ret_val = [];
    let play = Game.current_play;
    play.tiles.forEach((item, i) => {
      // need to revert state BEFORE Getting
      // the json state for the client - this keeps
      // stolen tiles from reverting to the wrongs
      // player hand. Also, the revert_state returns false
      // if there is no valid revert for this play.
      if (item.revert_state(play) && item.player == Game.current_player) {
        ret_val.push(item.get_JSON());
      }
    });
    // make sure the play is initialised
    play.tiles = [];
    return ret_val;
  }

  build_the_response(err_idx, tiles) {
    if (err_idx != -1) {
      tiles.unshift(
        {"err_msg" : Word.new_word.check_words[err_idx] + " is not a valid word, FOOL!"});
    }
    console.log("in build_the_response: " + tiles)
    return tiles;
  }

  played_tiles_update(player, data) {
    var played_tiles = [];

    // first, get the player tiles that were played
    if (Game.current_play && Game.current_player == player) {
      data.forEach((item, i) => {
        let id = parseInt(item.id.split("_")[1]);
        let t = player.tiles.find(tile => {
          if (tile == null) return;
          else if (tile.id == id)
            return tile.id;
        });
        // remove from player's hand place on the board
        player.tiles[t.player_hand_idx] = null;
        t.row = item.row;
        t.column = item.col;
        // if this is a blank tile, set the character (sent in the play_data)
        if (t.char == BLANK_TILE) {
          t.char = item.char;
        }
        played_tiles.push(t);
      });
    }

    return played_tiles;
  }

  handle_regular_play(player, play_data, played_tiles) {
    var ret_val;

    played_tiles.forEach((item, i) => {
      Tile.set_adjacencies(item);
      Tile.played_tiles.push(item);
      this.update_play(item);
      Word.new_word.addLetter(item, Game.current_player);
    });

    // finalize the word building
    if (Word.new_word.tiles.length > 0) {
      if (played_tiles.length == 7) {
        Word.new_word.is_safe = true;
      }

      // finalize returns the index of the first non-valid word
      let err_idx = -1;
      if ((err_idx = Word.new_word.finalize(this)) == -1) {
        let new_data = this.toggle_player_new_play();
        let word_tiles = Word.words[Word.words.length - 1].get_JSON();
        ret_val = this.build_the_response(err_idx, [{"new_data" : new_data,
                                                     "word_tiles" : word_tiles}]);
        Word.new_word = new Word(0, Game.current_play, Game.current_player,
          "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);
      } else {
        let roll_back_tiles = this.roll_back_current_play();
        // must happen before the new Word - the invalid word is at
        // Word.new_word.check_words[err_idx]
        ret_val = this.build_the_response(err_idx, roll_back_tiles);
        Word.new_word = new Word(0, Game.current_play, Game.current_player,
          "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);
      }
    }

    return ret_val;
  }

  handle_exchange(player, play_data, played_tiles) {
    var new_tiles = [];

    // first, get the replacement tiles (want to get replacements
    // before stuffing the old tiles to minimize possibility of getting
    // same tiles again.)
    for (let i = 0; i < played_tiles.length; i++) {
      let t = Tile.get_random_tile();
      t.setup_for_play(player, played_tiles[i].player_hand_idx, Game.current_play);
      new_tiles.push(t.get_JSON());
    }

    // now, stuff the played tiles back in the tile_pool
    for (let i = 0; i < played_tiles.length; i++) {
      played_tiles[i].player = null;
      played_tiles[i].row = -1;
      played_tiles[i].column = -1;

      // make sure any tiles released to the pool have
      // safety set according to the tile definiations
      let def = Tile.tile_defs.defs.find(item => {
        return item.char == played_tiles[i].char;
      });
      def ? played_tiles[i].is_safe = def.is_safe : played_tiles[i].is_safe = false;

      Tile.tile_pool.push(played_tiles[i]);
    }

    let err_idx = -1;
    let new_data = this.toggle_player_new_play();
    let ret_val = this.build_the_response(err_idx, [{"new_data" : new_data,
                                                 "new_tiles" : new_tiles}]);
    played_tiles = [];
    return ret_val;
  }

  finish_the_play(player, play_data) {
    var ret_val = null;

    // get the type of play and take it off the play_data
    var play_type = play_data[0].type;
    play_data.shift();

    var played_tiles = this.played_tiles_update(player, play_data);

    if (play_type == "regular_play") {
      ret_val = this.handle_regular_play(player, play_data, played_tiles);
    } else if (play_type == "xchange") {
      ret_val = this.handle_exchange(player, play_data, played_tiles);
    }

    console.log("in finish the play: ", ret_val);
    return JSON.stringify(ret_val);
  }

  update_play(tile) {
    // if it's already in the tile list ignore it
    let tl = Game.current_play.tiles.find (t => {
      return t == tile;
    });

    !tl ? Game.current_play.tiles.push(tile) :
      console.log("tile already in list: %d", tile.id);
  }

  get_the_response() {

  }

  toggle_player_new_play() {
    var new_data = [];

    Word.calculate_total_points(Game.current_game.player_1);
    Word.calculate_total_points(Game.current_game.player_2);

    if (Game.current_player == this.player_1) {
      new_data.push({"scoreboard_player_1_name" : "Wait ..."});
      new_data.push({"scoreboard_player_1_score" : Game.current_game.player_1.total_points});
      new_data.push({"scoreboard_player_2_name" : this.player_2.name});
      new_data.push({"scoreboard_player_2_score" : Game.current_game.player_2.total_points});
      new_data.push({"play_data" : this.player_1_play.get_played_JSON()});
      this.plays.push(this.player_1_play);
      this.player_1_play = new Play(0, this.player_1);
      new_data.push({"new_tiles" : this.player_1.update_hand(false, this.player_1_play)});
      Game.current_player = this.player_2;
      Game.current_play = this.player_2_play;
    } else {
      new_data.push({"scoreboard_player_2_name" : "Wait ..."});
      new_data.push({"scoreboard_player_2_score" : Game.current_game.player_2.total_points});
      new_data.push({"scoreboard_player_1_name" : this.player_1.name});
      new_data.push({"scoreboard_player_1_score" : Game.current_game.player_1.total_points});
      new_data.push({"play_data" : this.player_2_play.get_played_JSON()});
      this.plays.push(this.player_2_play);
      this.player_2_play = new Play(0, this.player_2);
      new_data.push({"new_tiles" : this.player_2.update_hand(false, this.player_2_play)});
      Game.current_player = this.player_1;
      Game.current_play = this.player_1_play;
    }

    new_data.push({"tiles_left_value" : Tile.tile_pool.length});
    Tile.total_tile_count = Tile.tile_pool.length;
    return new_data;
  }

  end_the_game() {
    alert("Game Over!!");
  }

  static current_id = 0;
  static current_game = null;
  static Tile = Tile;

  static NUM_ROWS_COLS = 15;
  static SAFETY_FILL = 'rgba(68,187,85,1)';
  static SAFETY_FILL_LITE = 'rgba(68,187,85,.3)';
  static CENTER_FILL = 'rgba(255,153,204,1)';
  static SAFE_INDEXES = [
    {row: 1, col: 1, rect: null},
    {row: 1, col: Game.NUM_ROWS_COLS, rect: null},
    {row: 2, col: 2, rect: null},
    {row: 2, col: Game.NUM_ROWS_COLS - 1, rect: null },
    {row: 3, col: 3, rect: null},
    {row: 3, col: Game.NUM_ROWS_COLS - 2, rect: null},

    {row: Game.NUM_ROWS_COLS, col: 1, rect: null},
    {row: Game.NUM_ROWS_COLS, col: Game.NUM_ROWS_COLS, rect: null},
    {row: Game.NUM_ROWS_COLS - 1, col: 2, rect: null},
    {row: Game.NUM_ROWS_COLS - 1, col: Game.NUM_ROWS_COLS - 1, rect: null},
    {row: Game.NUM_ROWS_COLS - 2, col: 3, rect: null},
    {row: Game.NUM_ROWS_COLS - 2, col: Game.NUM_ROWS_COLS - 2, rect: null},

    {row: 1, col: Math.round(Game.NUM_ROWS_COLS/2), rect: null},
    {row: Math.round(Game.NUM_ROWS_COLS/2), col: 1, rect: null},
    {row: Math.round(Game.NUM_ROWS_COLS/2), col: Game.NUM_ROWS_COLS, rect: null},
    {row: Game.NUM_ROWS_COLS, col: Math.round(Game.NUM_ROWS_COLS/2), rect: null}
  ];
}

// exports.CurrentGame = new Game();
exports.Game = Game;
