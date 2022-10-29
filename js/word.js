var Tile = require('./tile').Tile;
var logger = require('./log').logger;

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
    this.check_word_starts = [];
    this.points = points;
    this.start_row = start_row;
    this.start_column = start_col;
    this.orientation = orient;
    this.is_safe = is_safe;
    this.linked_in = false;
  }

  static new_word_json(js, player1, player2, plays) {
    let play = plays.find(p => {
      return p.id == js.play_id;
    });

    let w = null;
    if (js.player_id == player1.id)
      w = new Word(js.id, play, player1, js.word, js.points,
        js.start_row, js.start_column, js.orientation, js.is_safe);
    else if (js.player_id == player2.id)
      w = new Word(js.id, play, player2, js.word, js.points,
        js.start_row, js.start_column, js.orientation, js.is_safe);

    w.check_words = js.check_words;
    w.check_word_starts = js.check_word_starts;

    js.tiles.forEach((item, i) => {
      if (item.player_id == player1.id)
        w.tiles.push(Tile.new_tile_json(item, player1));
      else if (item.player_id == player2.id)
        w.tiles.push(Tile.new_tile_json(item, player2));
    });

    return w;
  }

  static ORIENTATIONS = {
    NONE : -1,
    HORIZ : 1,
    VERT : 2
  }
 
  // these are used to index into Errors
  static ErrorReserved = 9;
  static ErrorNoTiles = 10;
  static ErrorNotSameColumnRow = 11;
  static ErrorUnusedTile = 12;
  static ErrorMustStartAtCenter = 13;
  static ErrorNotConnected = 14;
  static Errors = [
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "ERROR : There are no played tiles",
      `ERROR : Not all tiles are on the same row or column OR are unused`,
      `ERROR : Not all tiles are on the same row or column OR are unused`,
      "ERROR : The first played word must cover the center square, 'START HERE'",
      "ERROR : Played words must connect to a previously played word"
  ];

  static NUM_ROWS_COLS = 15;
  static SAFE_INDEXES = [
    {row: 1, col: 1, rect: null},
    {row: 1, col: Word.NUM_ROWS_COLS, rect: null},
    {row: 2, col: 2, rect: null},
    {row: 2, col: Word.NUM_ROWS_COLS - 1, rect: null },
    // out as per email 20220522
    // {row: 3, col: 3, rect: null},
    // {row: 3, col: Word.NUM_ROWS_COLS - 2, rect: null},

    {row: Word.NUM_ROWS_COLS, col: 1, rect: null},
    {row: Word.NUM_ROWS_COLS, col: Word.NUM_ROWS_COLS, rect: null},
    {row: Word.NUM_ROWS_COLS - 1, col: 2, rect: null},
    {row: Word.NUM_ROWS_COLS - 1, col: Word.NUM_ROWS_COLS - 1, rect: null},
    // out as per email 20220522
    // {row: Word.NUM_ROWS_COLS - 2, col: 3, rect: null},
    // {row: Word.NUM_ROWS_COLS - 2, col: Word.NUM_ROWS_COLS - 2, rect: null},

    {row: 1, col: Math.round(Word.NUM_ROWS_COLS/2), rect: null},
    {row: Math.round(Word.NUM_ROWS_COLS/2), col: 1, rect: null},
    {row: Math.round(Word.NUM_ROWS_COLS/2), col: Word.NUM_ROWS_COLS, rect: null},
    {row: Word.NUM_ROWS_COLS, col: Math.round(Word.NUM_ROWS_COLS/2), rect: null}
  ];

  static last_id = 0;

  get_JSON() {
    var ret_val = {
      "id" : this.id,
      "player_id" : this.player.id,
      "play_id" : this.play ? this.play.id : -1,
      "check_words" : this.check_words,
      "check_word_starts" : this.check_word_starts,
      "points" : this.points,
      "start_row" : this.start_row,
      "start_column" : this.start_column,
      "orientation" : this.orientation,
      "is_safe" : this.is_safe,
      "tiles" : this.get_tiles_JSON()
    }
    return ret_val;
  }

  get_tiles_JSON() {
    var ret_val = [];
    this.tiles.forEach((item, idx) => {
      let js = item.get_JSON();
      ret_val.push(js);
    });
    return ret_val;
  }

  addLetter(tile, player, play) {
    this.points += tile.points;
    this.player = player;
    this.play = !this.play ? play : null;

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

  not_in(tile) {
    let ret_val;
    let t = this.tiles.find(t => {
      return t.id == tile.id;
    });
    t ? ret_val = false : ret_val = true;
    return ret_val;
  }

  set_adjacencies(game) {
    this.tiles.forEach((item, i) => {
      Tile.set_adjacencies(game, item);
    });
    this.tiles.forEach(item => {
      if ((item.left && this.not_in(item.left)) ||
          (item.right && this.not_in(item.right)) ||
          (item.up && this.not_in(item.up)) ||
          (item.down && this.not_in(item.down)))
        this.linked_in = true;
    });
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
        return i;
      }
    }
    if (valid)
      return -1;
    return 0;
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

  update_tile_state(game, tile, dont_follow) {

    if (!tile.is_safe) {
      game.update_play(tile);
      if ( this.player != tile.player) {
        tile.push_state(new Tile.TileState(tile, Tile.TileState.setplayer, game.current_play));
        tile.player = this.player;
      }
      if (this.is_safe && !dont_follow) {
        // this is for rolling back a play
        tile.push_state(new Tile.TileState(tile, Tile.TileState.setissafe, game.current_play));
        tile.is_safe = true;
      } else {
        tile.is_safe = false;
      }
    }
  }

follow_adjacencies(game, orientation, tile, dont_follow) {
    // recursively contains the words generated by the current play
    var w = [];

    // a stack of orthogonal tiles to test for wordishness
    var ortho = [];
    var word_start = null;
    var cword;

    // always go left to right, top down
    if (orientation == Word.ORIENTATIONS.HORIZ) {
      let t = tile;
      while (t.left) {t = t.left;}
      while (t) {
        w.push(t.char);
        if (w.length == 1) word_start = t.id;
        t.status |= Tile.utilized;
        // if additional words are created need to come back
        // and build the words - BUT - don't follow the other
        // player's tiles
        if (!dont_follow && t.word_id == this.id) {
          if (t.up || t.down) {ortho.push(t);}
        }
        this.update_tile_state(game, t, dont_follow);
        t = t.right;
      }
      // by now the first word is done
      cword = w.join("");
      if (!this.check_words.includes(cword))
      {
        this.check_words.push(cword);
        this.check_word_starts.push(word_start);
      }
      while (ortho.length > 0) {
        t = ortho.pop();
        // if a tile is a 'source' of safeness (those defined as such by TileDefs)
        // then all adjacencies must be followed and safetyed. (by contrast, a tile
        // like 'A' isn't a 'source of safeness' and only becomes safe through
        // adjacency with a 'source of safeness' - a TileDefs safe tile or a safe
        // square on the board).
        //              later that year ...
        // if we're following orthos then we don't care if t is_safe_tile, we
        // never want to follow. So ...
        // game.tile_defs.is_safe_tile(t) ?
          // this.follow_adjacencies(game, Word.ORIENTATIONS.VERT, t, false) :
        this.follow_adjacencies(game, Word.ORIENTATIONS.VERT, t, true);
      }
    }
    else if (orientation == Word.ORIENTATIONS.VERT) {
      let t = tile;
      while (t.up) {t = t.up;}
      while (t) {
        w.push(t.char);
        if (w.length == 1) word_start = t.id;
        t.status |= Tile.utilized;
        // if additional words are created need to come back
        // and build the words - BUT - don't follow the other
        // player's tiles
        if (!dont_follow && t.word_id == this.id) {
          if (t.left || t.right) {ortho.push(t);}
        }
        this.update_tile_state(game, t, dont_follow);
        t = t.down;
      }
      // by now the first word is done
      cword = w.join("");
      if (!this.check_words.includes(cword)) {
        this.check_words.push(cword);
        this.check_word_starts.push(word_start);
      }
      while (ortho.length > 0) {
        t = ortho.pop();
        // if a tile is a 'source' of safeness (those defined as such by TileDefs)
        // then all adjacencies must be followed an safetyed. (by contrast, a tile
        // like 'A' isn't a 'source of safeness' and only becomes safe through
        // adjacency with a 'source of safeness' - a TileDefs safe tile or a safe
        // square on the board).
        //              later that year ...
        // if we're following orthos then we don't care if t is_safe_tile, we
        // never want to follow. So ...
        // game.tile_defs.is_safe_tile(t) ?
        //   this.follow_adjacencies(game, Word.ORIENTATIONS.HORIZ, t, false) :
        this.follow_adjacencies(game, Word.ORIENTATIONS.HORIZ, t, true);
      }
    }
    else if (orientation == Word.ORIENTATIONS.NONE) {
      if (tile.right || tile.left) {
        this.follow_adjacencies(game, Word.ORIENTATIONS.HORIZ, tile, false);
      }
      if (tile.up || tile.down) {
        this.follow_adjacencies(game, Word.ORIENTATIONS.VERT, tile, false);
      }
    }
  }

  // cleanup_drag() {
  //   this.tiles.forEach((item, i) => {
  //     item.drag.remove();
  //     item.drag = null;
  //   });
  // }

  finalize(game) {
    var ret_val = -1;

    if (!this.tiles || !this.tiles[0])
      ret_val = Word.ErrorNoTiles;

    // if this is the first word insure that one of the tiles is
    // at the square r/c 8/8 - the Start Here square
    if (game.words.length == 0) {
      let t = this.tiles.find((item, i) => {
        return item.row == 8 && item.column == 8;
      });
      if (!t) ret_val = Word.ErrorMustStartAtCenter;
      else this.linked_in = true;
    }
    else if (!this.linked_in)
      ret_val = Word.ErrorNotConnected;

    if (this.orientation == Word.ORIENTATIONS.HORIZ) {
      this.tiles.sort(function (a, b) {
        return a.column - b.column;
      });
    } else if (this.orientation == Word.ORIENTATIONS.VERT) {
      this.tiles.sort(function (a, b) {
        return a.row - b.row;
      });
    }

    // insure the 'play' is set ... (needs more investigation)
    if (!this.play) this.play = game.current_play;

    this.start_row = this.tiles[0].row;
    this.start_column = this.tiles[0].column;

    this.handle_safe();

    // follow all adjacencies to build words
    // and set safety
    this.follow_adjacencies(game, this.orientation, this.tiles[0], false);

    // now, insure all tiles are in the same column or same row
    if (this.tiles.length > 1) {
      if (this.orientation == Word.ORIENTATIONS.NONE)
        ret_val = Word.ErrorNotSameColumnRow;
      else if (this.orientation == Word.ORIENTATIONS.HORIZ) {
        let row = this.tiles[0].row;
        let t = this.tiles.find((item, i) => {
          if (!(item.status & Tile.utilized))
            ret_val = Word.ErrorUnusedTile;
          return item.row != row;
        });
        if (t) // NOT on same row
          ret_val = Word.ErrorNotSameColumnRow;
      }
      else if (this.orientation == Word.ORIENTATIONS.VERT) {
        let col = this.tiles[0].column;
        let t = this.tiles.find((item, i) => {
          if (!(item.status & Tile.utilized))
            ret_val = Word.ErrorUnusedTile;
          return item.column != col;
        });
        if (t) // NOT on same column
          ret_val = Word.ErrorNotSameColumnRow;
      }
    }

    // returns idx of non-valid word
    if (!(ret_val > Word.ErrorReserved) && (ret_val = this.all_words_valid()) == -1) {
      // set the status of all valid-word tiles to 'on_board'
      this.tiles.forEach(w => {
        if (w.status & Tile.in_hand) w.status ^= Tile.in_hand;
        w.status |= Tile.on_board;
      });
      game.words.push(this);
    }

    // DEBUG indicate the beginings of words
    // this.is_safe ? this.tiles[0].set_text_color(this.player.tile_color_risky) :
    //   this.tiles[0].set_text_color(this.player.tile_color_safe);
    // this.tiles[0].set_tool_tips(this.check_words);

    return ret_val;
  }

}

exports.Word = Word;
