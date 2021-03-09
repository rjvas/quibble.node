var Tile = require('./tile').Tile;

var words2letter = require('./2-letter-words');
var words3letter = require('./3-letter-words');
var words4letter = require('./4-letter-words');
var words5letter = require('./5-letter-words');
var words6letter = require('./6-letter-words');
var words7letter = require('./7-letter-words');
var words8letter = require('./8-letter-words');
var words9letter = require('./9-letter-words');
var words10letter = require('./10-letter-words');
var words11letter = require('./11-letter-words');
var words12letter = require('./12-letter-words');
var words13letter = require('./13-letter-words');
var words14letter = require('./14-letter-words');
var words15letter = require('./15-letter-words');

/*
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var WordSchema = new Schema(
  {
    start_row: {type: Integer, required: true},
    start_column: {type: Integer, required: true},
    orientation: {type: Integer, required: true},
    is_safe: {type: boolean, required: true},

    // an array of ascii word that must verify for the
    // play to proceed - otherwise cancel the play
    check_words = [{type: String, required: true, maxlength: 15}];

    player_id: {type: Schema.Types.ObjectId, ref: 'Player', required: true},
    tiles = [{type: Schema.Types.ObjectId, ref: 'Tile', required: true}];
  }
);


//Export model
module.exports = mongoose.model('Word', WordSchema);
*/

class Word {
  constructor(id, play, player, word, points, start_row, start_col, orient, is_safe) {

    // when reading from the db
    if (id != 0) {
      this.id = id;
      Word.last_id = Math.max(id, Word.last_id);
    } else {
      this.id = ++Word.last_id;
    }

    player != null ? this.player = player : this.player = null;
    play != null ? this.play = play : this.play = null;

    this.tiles = [];

    // an array of ascii word that must verify for the
    // play to proceed - otherwise cancel the play
    this.check_words = [];
    this.points = points;
    this.start_row = start_row;
    this.start_column = start_col;
    this.orientation = orient;
    this.is_safe = is_safe;
  }

  static ORIENTATIONS = {
    NONE : -1,
    HORIZ : 1,
    VERT : 2
  }

  static NUM_ROWS_COLS = 15;
  static SAFE_INDEXES = [
    {row: 1, col: 1, rect: null},
    {row: 1, col: Word.NUM_ROWS_COLS, rect: null},
    {row: 2, col: 2, rect: null},
    {row: 2, col: Word.NUM_ROWS_COLS - 1, rect: null },
    {row: 3, col: 3, rect: null},
    {row: 3, col: Word.NUM_ROWS_COLS - 2, rect: null},

    {row: Word.NUM_ROWS_COLS, col: 1, rect: null},
    {row: Word.NUM_ROWS_COLS, col: Word.NUM_ROWS_COLS, rect: null},
    {row: Word.NUM_ROWS_COLS - 1, col: 2, rect: null},
    {row: Word.NUM_ROWS_COLS - 1, col: Word.NUM_ROWS_COLS - 1, rect: null},
    {row: Word.NUM_ROWS_COLS - 2, col: 3, rect: null},
    {row: Word.NUM_ROWS_COLS - 2, col: Word.NUM_ROWS_COLS - 2, rect: null},

    {row: 1, col: Math.round(Word.NUM_ROWS_COLS/2), rect: null},
    {row: Math.round(Word.NUM_ROWS_COLS/2), col: 1, rect: null},
    {row: Math.round(Word.NUM_ROWS_COLS/2), col: Word.NUM_ROWS_COLS, rect: null},
    {row: Word.NUM_ROWS_COLS, col: Math.round(Word.NUM_ROWS_COLS/2), rect: null}
  ];

  static release_all_words() {
    // for (let j = 0; j < Word.words.length; j++) {
    //   Word.words[j].tiles.forEach((item) => {
    //     item.player = null;
    //     item.row = -1;
    //     item.column = -1;
    //     let def = Tile.tile_defs.find(it => {
    //       return it.char == item.char;
    //     });
    //     def ? item.is_safe = def.is_safe : item.is_safe = false;
    //     Tile.tile_pool.push(item);
    //     item = null;
    //   });
    //   Word.words[j] = null;
    // }
    Word.words = [];
  }

  static calculate_total_points(player) {
    player.total_points = 0;
    for (let i = 0; i < Word.words.length; i++) {
      for (let j = 0; j < Word.words[i].tiles.length; j++) {
        if (Word.words[i].tiles[j].player == player) {
          player.total_points += Word.words[i].tiles[j].points;
        }
      }
    }
  }

  static last_id = 0;
  static words = [];
  static new_word = new Word(0, null, null, "", 0, -1, -1, Word.ORIENTATIONS.NONE, false);

  get_JSON() {
    var ret_val = [];
    this.tiles.forEach((item, idx) => {
      let js = item.get_JSON();
      ret_val.push(js);
    });
    return ret_val;
  }

  addLetter(tile, player) {
    this.points += tile.points;
    this.player = player;

    this.tiles.push(tile);
    tile.word_id = this.id;

    if (this.orientation == Word.ORIENTATIONS.NONE &&
       this.tiles.length > 1) {
      // determine orientations
      if (this.tiles[0].row == this.tiles[1].row) {
        this.orientation = Word.ORIENTATIONS.HORIZ;
      }
      else if (this.tiles[0].column == this.tiles[1].column) {
        this.orientation = Word.ORIENTATIONS.VERT;
      }
    }
  }

  all_words_valid() {
    var valid;

    // first, lower case all the words
    for (let i = 0; i < this.check_words.length; i++) {
      this.check_words[i] = this.check_words[i].toLowerCase();
    }

    // now check them against the word lists based on word length
    for (let i = 0; i < this.check_words.length; i++) {
      switch (this.check_words[i].length) {
        case 2:
            valid = words2letter.find(w => {
              return w.word == this.check_words[i];
            });
          break;
        case 3:
            valid = words3letter.find(w => {
              return w.word == this.check_words[i];
            });
          break;
        case 4:
            valid = words4letter.find(w => {
              return w.word == this.check_words[i];
            });
          break;
        case 5:
          valid = words5letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 6:
          valid = words6letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 7:
          valid = words7letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 8:
          valid = words8letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 9:
          valid = words9letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 10:
          valid = words10letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 11:
          valid = words11letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 12:
          valid = words12letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 13:
          valid = words13letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 14:
          valid = words14letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        case 15:
          valid = words15letter.find(w => {
            return w.word == this.check_words[i];
          });
          break;
        default:
      }
      if (valid) {
        continue;
      } else {
        // TODO:
        // window.alert("Not a valid word: " + this.check_words[i].toUpperCase());
        return i;
      }
    }
    return -1;
  }

  // from the specs:

  // Ways to get “safe” words:1. Play one tile of your word on a green “safe”
  // square2. Play a word with J, Q, X or Z in it3. Create a word with all 7
  // tiles in your hand at once

  handle_safe() {
    // 'Word' is used very loosely. Words don't matter much; it's all
    // about the tiles. So, a 'Word' may be just an 's'.

    // First check all played tiles against the safety row/cols
    for (let i = 0; i < this.tiles.length; i++) {
      let tile = this.tiles[i];

      if (Word.SAFE_INDEXES.find(({ row, col }) => row == tile.row &&
          col == tile.column)) {
        if (!tile.is_safe) {
          // this is an undo state so set prior to the WoreWor
          tile.push_state(new Tile.TileState(tile, Tile.TileState.setissafe, this.play));
          tile.is_safe = true;
        }
        this.is_safe = true;
      } else if (tile.is_safe) {
        this.is_safe = true;
      }

    }
  }

  update_tile_safety(current_game, tile, dont_follow) {

    if (!tile.is_safe) {
      current_game.update_play(tile);
      if ( this.player != tile.player) {
        tile.push_state(new Tile.TileState(tile, Tile.TileState.setplayer, this.play));
        tile.player = this.player;
      }
      if (this.is_safe && !dont_follow) {
        // this is for rolling back a play
        tile.push_state(new Tile.TileState(tile, Tile.TileState.setissafe, this.play));
        tile.is_safe = true;
      } else {
        tile.is_safe = false;
      }
    }

  }

  follow_adjacencies(current_game, orientation, tile, dont_follow) {
    // recursively contains the words generated by the current play
    var w = [];

    // a stack of orthogonal tiles to test for wordishness
    var tmp = [];

    // always go left to right, top down
    if (orientation == Word.ORIENTATIONS.HORIZ) {
      let t = tile;
      while (t.left) {t = t.left;}
      while (t) {
        w.push(t.char);
        // if additional words are created need to come back
        // and build the words - BUT - don't follow the other
        // player's tiles
        if (!dont_follow && t.word_id == this.id) {
          if (t.up || t.down) {tmp.push(t);}
        }
        this.update_tile_safety(current_game, t, dont_follow);
        t = t.right;
      }
      // by now the first word is done
      this.check_words.push(w.join(""));
      while (tmp.length > 0) {
        t = tmp.pop();
        // if a tile is a 'source' of safeness (those defined as such by TileDefs)
        // then all adjacencies must be followed an safetyed. (by contrast, a tile
        // like 'A' isn't a 'source of safeness' and only becomes safe through
        // adjacency with a 'source of safeness' - a TileDefs safe tile or a safe
        // square on the board).
        Tile.tile_defs.is_safe_tile(t) ?
          this.follow_adjacencies(current_game, Word.ORIENTATIONS.VERT, t, false)
        : this.follow_adjacencies(current_game, Word.ORIENTATIONS.VERT, t, true);
      }
    }
    else if (orientation == Word.ORIENTATIONS.VERT) {
      let t = tile;
      while (t.up) {t = t.up;}
      while (t) {
        w.push(t.char);
        // if additional words are created need to come back
        // and build the words - BUT - don't follow the other
        // player's tiles
        if (!dont_follow && t.word_id == this.id) {
          if (t.left || t.right) {tmp.push(t);}
        }
        this.update_tile_safety(current_game, t, dont_follow);
        t = t.down;
      }
      // by now the first word is done
      this.check_words.push(w.join(""));
      while (tmp.length > 0) {
        t = tmp.pop();
        // if a tile is a 'source' of safeness (those defined as such by TileDefs)
        // then all adjacencies must be followed an safetyed. (by contrast, a tile
        // like 'A' isn't a 'source of safeness' and only becomes safe through
        // adjacency with a 'source of safeness' - a TileDefs safe tile or a safe
        // square on the board).
        Tile.tile_defs.is_safe_tile(t) ?
          this.follow_adjacencies(current_game, Word.ORIENTATIONS.HORIZ, t, false)
        : this.follow_adjacencies(current_game, Word.ORIENTATIONS.HORIZ, t, true);
      }
    }
    else if (orientation == Word.ORIENTATIONS.NONE) {
      if (tile.right || tile.left) {
        this.follow_adjacencies(current_game, Word.ORIENTATIONS.HORIZ, tile, false);
      }
      if (tile.up || tile.down) {
        this.follow_adjacencies(current_game, Word.ORIENTATIONS.VERT, tile, false);
      }
    }
  }

  // cleanup_drag() {
  //   this.tiles.forEach((item, i) => {
  //     item.drag.remove();
  //     item.drag = null;
  //   });
  // }

  finalize(current_game) {
    var ret_val = -1;

    if (this.orientation == Word.ORIENTATIONS.HORIZ) {
      this.tiles.sort(function (a, b) {
        return a.column - b.column;
      });
    } else if (this.orientation == Word.ORIENTATIONS.VERT) {
      this.tiles.sort(function (a, b) {
        return a.row - b.row;
      });
    }

    this.start_row = this.tiles[0].row;
    this.start_column = this.tiles[0].column;

    this.handle_safe();

    // follow all adjacencies to build words
    // and set safety
    this.follow_adjacencies(current_game, this.orientation, this.tiles[0], false);

    // returns idx of non-valid word
    if ((ret_val = this.all_words_valid()) == -1) {
      // this.cleanup_drag();
      Word.words.push(this);
    }

    // DEBUG indicate the beginings of words
    // this.is_safe ? this.tiles[0].set_text_color(this.player.tile_color_risky) :
    //   this.tiles[0].set_text_color(this.player.tile_color_safe);
    // this.tiles[0].set_tool_tips(this.check_words);

    return ret_val;
  }

}

exports.Word = Word;
