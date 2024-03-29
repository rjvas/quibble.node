/*
   Copyright 2021 Richard Vassilaros 
*/

var Play = require('./play').Play;
var Player = require('./player').Player;
var Tile = require ('./tile').Tile;
var TileDefs = require ('./tileDefs').TileDefs;
var Word = require ('./word').Word;
var logger = require('./log').logger;
const https = require('https');

const BLANK_TILE = " ";

class Game {
  constructor (id, player1_name, player2_name, clean) {
    // id will be passed in during construction or will be gen'd
    // by the constuctor. If passed in it will be a Mongo generated
    // id.
    if (id) {
      this._id = id;
    }
    else {
      this.id = ++Game.current_id;
    }

    this.plays = [];
    this.words = [];
    this.new_word = new Word(0, null, null, "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);

    // only counts consecutive passes - the player1 passes, player2 does not, then
    // pass count resets. when both pass, game over. managed on finish_the_play
    // and handle_pass
    this.consecutive_pass_count = 2;

    // for building the grid page - see grid.pug
    Game.is_blank = Tile.is_blank;

    // tile info for the game
    this.tile_pool = [];
    this.tile_defs = null; // initialized in Tile.init_Tile()
    this.played_tiles = [];

    if (!clean) {
      Tile.init_Tile(this);

      // s_count is the total number of S's in the tile pool at start
      // s_count is used to display # of played S's to users
      let def = this.tile_defs.defs.find(item => {
        return item.char == "S";
      });
      def ? this.total_s_count = def.count : this.total_s_count = 0;
      this.played_s_count = 0;

      this.default_name = "Game " + this.id;
      player1_name && player2_name ? this.name = player1_name + " vs " + player2_name :
        this.name = this.default_name;

      this.name_time = this.name + " - " + Game.build_date_part();

      // this.player_1 = new Player(0, "Player 1", "rgba(255, 99, 121, 0.3)", "rgba(255, 99, 121, 1)", 0);
      this.player_1 = new Player(0, "Player 1", "#f179af", "#eb008b", 0);
      this.player_1.name = player1_name;
      this.player_1_play = new Play(0, this.player_1);
      this.player_1.update_hand(this, true, this.player_1_play);

      this.player_2 = new Player(0, "Player 2", "#44c7f4", "#0072bc", 0);
      this.player_2.name = player2_name;
      this.player_2_play = new Play(0, this.player_2);
      this.player_2.update_hand(this, true, this.player_2_play);

      this.current_play = this.player_1_play;
      this.current_player = this.player_1;
      this.current_play.player = this.player_1;
    }
  }

  static build_date_part() {
    let parts = Date().split(" ");
    parts.shift(); //get rid of day name
    let tparts = parts[3].split(":");
    let hr = parseInt(tparts.shift());
    let ampm;
    if (hr >= 12) {
      ampm = " PM";
      if (hr > 12) hr -= 12;
    } else ampm = " AM";
    let date_str = parts[0] + " "  + parts[1] + " " + hr + ":" + tparts[0] + ampm;
    return date_str;
  }

  static current_id = 0;
  static current_game = null;
  static Tile = Tile;

  static NUM_ROWS_COLS = 15;
  static SAFE_INDEXES = [
    {row: 1, col: 1, rect: null},
    {row: 1, col: Game.NUM_ROWS_COLS, rect: null},
    {row: 2, col: 2, rect: null},
    {row: 2, col: Game.NUM_ROWS_COLS - 1, rect: null },
    // out as per email 20220522
    // {row: 3, col: 3, rect: null},
    // {row: 3, col: Game.NUM_ROWS_COLS - 2, rect: null},

    {row: Game.NUM_ROWS_COLS, col: 1, rect: null},
    {row: Game.NUM_ROWS_COLS, col: Game.NUM_ROWS_COLS, rect: null},
    {row: Game.NUM_ROWS_COLS - 1, col: 2, rect: null},
    {row: Game.NUM_ROWS_COLS - 1, col: Game.NUM_ROWS_COLS - 1, rect: null},
    // out as per email 20220522
    // {row: Game.NUM_ROWS_COLS - 2, col: 3, rect: null},
    // {row: Game.NUM_ROWS_COLS - 2, col: Game.NUM_ROWS_COLS - 2, rect: null},

    {row: 1, col: Math.round(Game.NUM_ROWS_COLS/2), rect: null},
    {row: Math.round(Game.NUM_ROWS_COLS/2), col: 1, rect: null},
    {row: Math.round(Game.NUM_ROWS_COLS/2), col: Game.NUM_ROWS_COLS, rect: null},
    {row: Game.NUM_ROWS_COLS, col: Math.round(Game.NUM_ROWS_COLS/2), rect: null}
  ];

  static new_game_json(js) {
    // do this last
    let g = new Game(js._id, null, null, true);

    // only counts consecutive passes - the player1 passes, player2 does not, then
    // pass count resets. when both pass, game over. managed on finish_the_play
    // and handle_pass
    g.consecutive_pass_count = js.pass_count;

    // tile info for the game
    js.tile_pool.forEach((item, i) => {
      g.tile_pool.push(Tile.new_tile_json(item));
    });

    g.tile_defs = new TileDefs();
    g.total_s_count = js.total_s_count;
    g.played_s_count = js.played_s_count;

    g.default_name = js.default_name;
    g.name = js.name;
    g.name_time = js.name_time;

    g.player_1 = Player.new_player_json(js.player_1);
    g.player_1_play = new Play(-1, g.player_1);

    g.player_2 = Player.new_player_json(js.player_2);
    g.player_2_play = new Play(-1, g.player_2);

    // sets up new plays
    if (js.current_player_id == g.player_1.id) {
      g.current_player = g.player_1;
      g.current_play = g.player_1_play;
    }
    else if (js.current_player_id == g.player_2.id) {
      g.current_player = g.player_2;
      g.current_play = g.player_2_play;
    }
    g.current_play.player = g.current_player;

    js.plays.forEach((item, i) => {
      if (item.player == g.player_1.id)
        g.plays.push(Play.new_play_json(item, g.player_1));
      else if (item.player == g.player_2.id)
        g.plays.push(Play.new_play_json(item, g.player_2));
    });

    js.words.forEach((item, i) => {
      let word = Word.new_word_json(item, g.player_1, g.player_2, g.plays);
      word.tiles.forEach((t, i) => {
        g.played_tiles.push(t);
      });
      word.set_adjacencies(g);
      g.words.push(word);
    });

    g.new_word = new Word(0, g.current_play, g.current_player, "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);

    return g;
  }

  save()  {
    var game_json = this.get_JSON();
    //
    // const q = { user_name: user_name };
    // const update =
    //   { $set:  { "user_name": user_name, "display_name" : display_name, "password" : pw_hashed, "email" : email }};
    // const options = { upsert: true };
    // db.get_db().collection('users').updateOne(q, update, options)
    //   .catch((e) => {
    //     console.error(e);
    //   });
    return this.id;
  }

  get_JSON() {
    return {
      // only submit the passed in id (Mongo generated)
      // "_id" : this._id,

      "plays" : this.get_plays_JSONS(),
      "words" : this.get_words_JSONS(),
      "pass_count" : this.consecutive_pass_count,

      "tile_pool" : this.get_tile_pool_JSONS(),
      "played_tiles" : this.get_played_tiles_JSONS,
      "total_s_count" : this.total_s_count,
      "played_s_count" : this.played_s_count, 

      "name" : this.name,
      "default_name" : this.default_name,
      "name_time" : this.name_time,

      "player_1" : this.player_1.get_JSON(),
      "player_2" : this.player_2.get_JSON(),

      "current_player_id" : this.current_player.id
    }
  }

  get_plays_JSONS() {
    var ret_val = [];
    this.plays.forEach((item, idx) => {
      let js = item.get_JSON();
      ret_val.push(js);
    });
    return ret_val;
  }

  get_words_JSONS() {
    var ret_val = [];
    this.words.forEach((item, idx) => {
      let js = item.get_JSON();
      ret_val.push(js);
    });
    return ret_val;
  }

  get_tile_pool_JSONS() {
    var ret_val = [];
    this.tile_pool.forEach((item, idx) => {
      let js = item.get_JSON();
      ret_val.push(js);
    });
    return ret_val;
  }

  // total_points are persisted, safe_points are not
  calculate_points(player) {
    player.total_points = 0;
    player.safe_points = 0;
    for (let i = 0; i < this.words.length; i++) {
      for (let j = 0; j < this.words[i].tiles.length; j++) {
        if (this.words[i].tiles[j].player == player) {
          player.total_points += this.words[i].tiles[j].points;
          if (this.words[i].tiles[j].is_safe)
            player.safe_points += this.words[i].tiles[j].points;
        }
      }
    }
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
    let play = this.current_play;
    play.tiles.forEach((item, i) => {
      if (item.status & Tile.utilized) item.status ^= Tile.utilized;
      // change in behavior on rollback leaves tiles on the board. so
      // don't clear this status
      // if (item.status & Tile.on_board) item.status ^= Tile.on_board;
      if (this.new_word && this.new_word.tiles.includes(item) &&
          item.status & Tile.is_blank) {
        item.char = BLANK_TILE;
      }
      // need to revert state BEFORE Getting
      // the json state for the client - this keeps
      // stolen tiles from reverting to the wrong
      // player hand. Also, the revert_state returns false
      // if there is no valid revert for this play.

      if (item.revert_state(play) && item.player == this.current_player) {
        let null_idx = -1;
        this.current_player.tiles.find((t, idx) => {
          if (!t) {
            null_idx = idx;
            return;
          }
        });
        if (null_idx != -1) {
          item.player_hand_idx = null_idx;
          this.current_player.tiles[null_idx] = item;
          Tile.clear_adjacencies(this, item);
          ret_val.push(item.get_JSON());
        }
      }
    });
    // make sure the play is initialised
    play.tiles = [];
    return ret_val;
  }

  get_the_errors(err_idx, tiles) {
    if (err_idx > Word.ErrorReserved) {
      tiles.unshift( {"err_msg" : Word.Errors[err_idx]});
      logger.debug("game.get_the_errors: err_msg : " + tiles[0].err_msg);
    }
    else if (err_idx != -1) {
      tiles.unshift(
        {"err_msg" : this.new_word.check_words[err_idx] + " is not a valid word"});
      logger.debug("game.get_the_errors: err_msg : " + tiles[0].err_msg);
    }
    // logger.info("in get_the_errors: " + tiles)
    return tiles;
  }

  played_tiles_update(player, data) {
    var played_tiles = [];

    // first, get the player tiles that were played
    if (this.current_play && this.current_player == player) {
      data.forEach((item, i) => {
        let id = parseInt(item.id.split("_")[1]);
        let tile = player.tiles.find((t, j) => {
          if (t && t.id == id) {
            // have to convert player_hand_idx between client and Server
            // due to ability to rearrange tiles in the player-hand
            t.player_hand_idx = j;
            return t;
          }
        });
        // remove from player's hand 
        if (tile && tile.player_hand_idx != -1) {
          player.tiles[tile.player_hand_idx] = null;
          tile.row = item.row;
          tile.column = item.col;
          // if this is a blank tile, set the character (sent in the play_data)
          if (tile.status & Tile.is_blank) {
            tile.char = item.char;
          }
          played_tiles.push(tile);
        }
      });
    }

    return played_tiles;
  }

  handle_regular_play(player, play_data, played_tiles) {
    var ret_val = [];

    played_tiles.forEach((item, i) => {
      this.played_tiles.push(item);
      this.update_play(item);
      this.new_word.addLetter(item, this.current_player, this.current_play);
    });

    this.new_word.set_adjacencies(this);

    // console.log(`game.handle_regular_play 1 played_tiles, this.new_word`);
    // logger.debug(`game.handle_regular_play 1 played_tiles, this.new_word :`);
    // played_tiles.forEach(t => {
      // console.dir(t.get_JSON());
      // logger.debug(`${JSON.stringify(t.get_JSON())}`);
    // });
    // console.dir(this.new_word);
    // logger.debug(`${JSON.stringify(this.new_word.get_JSON())}`);

    // if all 7 tiles in the player's hand are used in a word it is 'safe'
    if (this.new_word.tiles.length > 0 && played_tiles.length > 6) {
        this.new_word.is_safe = true;
      }

      // finalize returns the index of the first non-valid word
      let err_idx = -1;
      if ((err_idx = this.new_word.finalize(this)) == -1) {
        this.new_word.tiles.forEach(t => {
          if (t.char == 'S') this.played_s_count++;
        });
        let new_data = this.toggle_player_new_play();
        let word_tiles = this.words[this.words.length - 1].get_tiles_JSON();

        // console.log(`game.handle_regular_play.finalized new_data, word_tiles: `);
        // console.dir(new_data);
        // console.dir(word_tiles);
        // logger.debug(`game.handle_regular_play.finalized new_data, word_tiles : ` +
          // `${JSON.stringify(new_data)} \n${JSON.stringify(word_tiles)}`);

        ret_val = this.get_the_errors(err_idx, [{"new_data" : new_data,
                                                     "word_tiles" : word_tiles}]);
        let msg_words = this.words[this.words.length - 1].check_words.join(" ");
        ret_val.unshift({"info" : player.name + " played the word(s): " + msg_words});
        this.new_word = new Word(0, this.current_play, this.current_player,
          "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);
          
      } else {
        let roll_back_tiles = this.roll_back_current_play();
        // must happen before the new Word - the invalid word is at
        // this.new_word.check_words[err_idx]
        ret_val = this.get_the_errors(err_idx, roll_back_tiles);
        ret_val.unshift({"info" : "none"});

        // console.log(`game.handle_regular_play.errored roll_back_tiles, ret_val: `);
        // console.dir(roll_back_tiles);
        // console.dir(ret_val);
        // logger.debug(`game.handle_regular_play.errored roll_back_tiles, ret_val :` +
          // ` ${JSON.stringify(roll_back_tiles)} \n${JSON.stringify(ret_val)}`);

        this.new_word = new Word(0, this.current_play, this.current_player,
          "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);
      }

    return ret_val;
  }

  handle_exchange(player, play_data, played_tiles) {
    var xchanged_tiles = [];

    // first, get the replacement tiles (want to get replacements
    // before stuffing the old tiles to minimize possibility of getting
    // same tiles again.)
    for (let i = 0; i < played_tiles.length; i++) {
      let t = this.get_random_tile();
      t.setup_for_play(player, played_tiles[i].player_hand_idx, this.current_play);
      xchanged_tiles.push(t.get_JSON());
    }

    // now, stuff the played tiles back in the tile_pool
    for (let i = 0; i < played_tiles.length; i++) {
      played_tiles[i].player = null;
      played_tiles[i].row = -1;
      played_tiles[i].column = -1;
      played_tiles[i].status = Tile.in_pool;

      // make sure any tiles released to the pool have
      // safety set according to the tile definiations
      // 20220726 NO SAFE TILES!
      // let def = this.tile_defs.defs.find(item => {
        // return item.char == played_tiles[i].char;
      // });
      // def ? played_tiles[i].is_safe = def.is_safe : played_tiles[i].is_safe = false;

      this.tile_pool.push(played_tiles[i]);
    }

    let err_idx = -1;
    let new_data = this.toggle_player_new_play();
    let ret_val = this.get_the_errors(err_idx, [{"new_data" : new_data,
                                                 "xchanged_tiles" : xchanged_tiles}]);
    ret_val.unshift({"info" : player.name + " has exchanged tiles - your turn."});

    played_tiles = [];
    return ret_val;
  }

  handle_pass(player, play_data) {
    this.consecutive_pass_count--;
    let new_data = this.toggle_player_new_play();
    let ret_val = this.get_the_errors(-1, [{"new_data" : new_data}]);
    ret_val.unshift({"info" : player.name + " has passed - your turn."});
    return ret_val;
  }

  handle_last_played_word() {
    var ret_val = [];
    let play = this.plays[this.plays.length - 1];
    play.tiles.forEach(t => {
      ret_val.push(t.get_JSON());
    });
    return ret_val;
  }

  cleanup_definitions(full_defs) {
    let ret_val = [];
    if (full_defs && full_defs[0] && full_defs[0].meanings) {
      full_defs[0].meanings.forEach(m => {
        let defs = [];
        m.definitions.forEach(d => {
          defs.push(d.definition);
        });
        ret_val.push({"partOfSpeech" : m.partOfSpeech});
        ret_val.push({"definitions" : defs});
      }); 
    }
    return ret_val;
  }

  handle_dictionary_lookup(sock, play_data) {
    let search_id = -1;
    let idx = -1;
    let lookup_words = [];

    if (play_data[2] && play_data[2].info)
      search_id = play_data[2].info;
    this.words.forEach(w => {
      if (w.check_word_starts) {
        w.check_word_starts.forEach((s, idx) => { 
          if (s == search_id)
            lookup_words.push(w.check_words[idx]);
        });
      }
    });

    let count = lookup_words.length;
    lookup_words.forEach(w => {
      let url = `https://api.dictionaryapi.dev/api/v2/entries/en/${w}`;

      const request = https.request(url, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data = data + chunk.toString();
        });
  
        response.on('end', () => {
          count--;
          const body = JSON.parse(data);
          play_data.push({"word" : w});
          play_data.push({"definitions" : this.cleanup_definitions(body)});
          if (count == 0)
            sock.send(JSON.stringify(play_data));
          // console.log(body);
        });
      })
  
      request.on('error', (error) => {
          console.log('An error', error);
      });
  
      request.end() 
    });
  }

  finish_the_play(player, play_data) {
    var ret_val = [];

    // get the type of play and take it off the play_data
    var play_type = play_data.shift();

    // console.log(`game.finish_the_play 1 play_data=`);
    // console.dir(play_data);
    // logger.debug(`game.finish_the_play 1 play_data = ${JSON.stringify(play_data)}`);

    var played_tiles = this.played_tiles_update(player, play_data);

    // console.log(`game.finish_the_play 2 played_tiles=`);
    // console.dir(played_tiles);
    // logger.debug(`game.finish_the_play 2 played_tiles = `);
    played_tiles.forEach(t => {
      logger.debug(JSON.stringify(t.get_JSON()));
    });

    if (play_type.type == "regular_play") {
      this.consecutive_pass_count = 2;
      ret_val = this.handle_regular_play(player, play_data, played_tiles);
    } else if (play_type.type == "xchange") {
      this.consecutive_pass_count = 2;
      ret_val = this.handle_exchange(player, play_data, played_tiles);
    } else if (play_type.type == "pass")
      ret_val = this.handle_pass(player, play_data);

    let player_txt = player == this.player_1 ? "/player1" :
      "/player2";
    ret_val.unshift({"player" : player_txt});

    // use the passed play_type to decode the response in board.js
    ret_val.unshift(play_type);

    if (player.get_tile_count() == 0 || this.consecutive_pass_count < 1)
      ret_val = this.end_game(player_txt);

    return ret_val;
  }

  update_play(tile) {
    // if it's already in the tile list ignore it
    let tl = this.current_play.tiles.find (t => {
      return t == tile;
    });

    if (!tl) this.current_play.tiles.push(tile);
      // logger.debug("game.update_play: already in list: " + tile.id + "/" +
      //   tile.char);
  }

  toggle_player_new_play() {
    var new_data = [{"new_tiles" : null}];
    var hand_data = [];

    this.calculate_points(this.player_1);
    this.calculate_points(this.player_2);

    if (this.current_player == this.player_1) {
      // new_data.push({"scoreboard_player_1_name" : "Wait ..."});
      new_data.push({"scoreboard_player_1_score" : this.player_1.total_points});
      new_data.push({"scoreboard_player_1_safe_score" : this.player_1.safe_points});
      // new_data.push({"scoreboard_player_2_name" : this.player_2.name});
      new_data.push({"scoreboard_player_2_score" : this.player_2.total_points});
      new_data.push({"scoreboard_player_2_safe_score" : this.player_2.safe_points});
      new_data.push({"scoreboard_total_s_count" : this.total_s_count});
      new_data.push({"scoreboard_played_s_count" : this.played_s_count});
      new_data.push({"play_data" : this.player_1_play.get_played_JSONS()});
      this.plays.push(this.player_1_play);
      this.player_1_play = new Play(0, this.player_1);
      this.player_1.update_hand(this, false, this.player_1_play, hand_data);
      new_data[0].new_tiles = hand_data;
      this.current_player = this.player_2;
      this.current_play = this.player_2_play;
    } else {
      // new_data.push({"scoreboard_player_2_name" : "Wait ..."});
      new_data.push({"scoreboard_player_2_score" : this.player_2.total_points});
      new_data.push({"scoreboard_player_2_safe_score" : this.player_2.safe_points});
      // new_data.push({"scoreboard_player_1_name" : this.player_1.name});
      new_data.push({"scoreboard_player_1_score" : this.player_1.total_points});
      new_data.push({"scoreboard_player_1_safe_score" : this.player_1.safe_points});
      new_data.push({"scoreboard_total_s_count" : this.total_s_count});
      new_data.push({"scoreboard_played_s_count" : this.played_s_count});
      new_data.push({"play_data" : this.player_2_play.get_played_JSONS()});
      this.plays.push(this.player_2_play);
      this.player_2_play = new Play(0, this.player_2);
      this.player_2.update_hand(this, false, this.player_2_play, hand_data);
      new_data[0].new_tiles = hand_data;
      this.current_player = this.player_1;
      this.current_play = this.player_1_play;
    }

    new_data.unshift({"tiles_left_value" : this.tile_pool.length});
    return new_data;
  }

  get_tile(char) {
    var ret_val = null;

    var idx = this.tile_pool.findIndex(t => {
      return t.char == char;
    });

    if (idx > -1) {
      ret_val = this.tile_pool[idx];
      // remove that tile from the pool
      this.tile_pool.splice(idx, 1);
    }

    return ret_val;
  }

  get_random_tile() {
    var ret_val = null;

    var min = 0;
    var max = this.tile_pool.length - 1;
    var rand_idx = Math.floor(Math.random() * (max - min)) + min;
    if (rand_idx > -1) {
      ret_val = this.tile_pool[rand_idx];
      // remove that tile from the pool
      this.tile_pool.splice(rand_idx, 1);
    }

    return ret_val;
  }

  end_game(player) {
    var ret_val = [];

    // the tiles remaining in player1's hand are point-totaled
    // and added to p2's score - and vis-versa
    let p1_hand_points = 0;
    this.player_1.tiles.forEach((item, i) => {
        if (item) p1_hand_points += item.points;
    });
    // this.player_1.total_points -= p1_hand_points;
    // add to player 2
    this.player_2.total_points += p1_hand_points;

    // now the same for player 2
    let p2_hand_points = 0;
    this.player_2.tiles.forEach((item, i) => {
        if (item) p2_hand_points += item.points;
    });
    // remove from player 2
    // don't 7/3/2021
    // this.player_2.total_points -= p2_hand_points;
    // add to player 1
    this.player_1.total_points += p2_hand_points;

    ret_val.push({"type" : "game_over"});
    ret_val.push({"player" : player});

    ret_val.push({"player1" : {"name" : this.player_1.name,
                              "score" : this.player_1.total_points,
                              "remaining_tiles" : this.player_1.get_hand_JSONS()},
                  "player2" : {"name" : this.player_2.name,
                              "score" : this.player_2.total_points,
                              "remaining_tiles" : this.player_2.get_hand_JSONS()}});

    logger.info("Game Over!");

    return ret_val;
  }

}

// exports.CurrentGame = new Game();
exports.Game = Game;
