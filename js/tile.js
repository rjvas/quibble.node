var TileState = require('./tilestate').TileState;
var TileDefs = require('./tiledefs').TileDefs;
var logger = require('./log').logger;

/*
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TileSchema = new Schema(
  {
    char: {type: String, required: true, maxlength: 1},
    is_safe: {type: boolean, required: true, default: false},
    row: {type: Integer, required: true},
    column: {type: Integer, required: true},

    word_id: {type: Schema.Types.ObjectId, ref: 'Word', required: true},
    player_id: {type: Schema.Types.ObjectId, ref: 'Player', required: true},
    states: [{type: Schema.Types.ObjectId, ref: 'TileState', required: false}]
  }
);


//Export model
module.exports = mongoose.model('Tile', TileSchema);
*/

class Tile {
  constructor (id, char, points, safe, row, column, status, player) {
    if (id != 0) {
      this.id = id;
      // Tile.last_id = Math.max(id, Tile.last_id);
    } else {
      this.id = ++Tile.last_id;
    }
    this.char = char;
    this.points = points;
    this.is_safe = safe;
    this.row = row;
    this.column = column;
    this.word_id = -1;
    this.player = player;
    this.player_hand_idx = -1;
    this.up = null;
    this.down = null;
    this.left = null;
    this.right = null;
    this.states = [];
    this.status = status;
  }

  get_JSON() {
    let fill = "white";
    if (this.player) {
      fill = this.is_safe ? this.player.tile_color_safe :
        this.player.tile_color_risky;
    }
    return {
      "id" : this.id,
      "char" : this.char,
      "points" : this.points,
      "is_safe" : this.is_safe,
      "row" : this.row,
      "column" : this.column,
      "status" : this.status,
      "fill" : fill,
      "player_id" : this.player ? this.player.id : -1,
      "player_hand_idx" : this.player_hand_idx
    };
  }

  // Tiles are constructed with the current play - since
  // all tiles are rarely used the tile can be
  // out of sync with the current play
  update_states_inplay(play) {
    this.states.forEach((item, i) => {
      item.in_play = play;
    });
  }

  setup_for_play(player, pos, play) {

    this.player = player;
    this.status |= Tile.in_hand;

    player.tiles[pos] = this;
    this.player_hand_idx = pos;

    // should always be the first tile state
    let ts = TileState.setx | TileState.sety | TileState.setplayerhandidx;
    this.push_state(new TileState(this, ts, play));
  }

  fixup_tilestates(play) {
    if (this.states.length == 0) {
      // should always be the first tile state
      let ts = TileState.setx | TileState.sety | TileState.setplayerhandidx;
      this.push_state(new TileState(this, ts, play));
    } else { this.update_states_inplay(play); }
  }

  revert_state(play) {
    var ret_val = true;
    for (let i = this.states.length - 1; i > -1; i--) {
      if (this.states[i].in_play == play) {
        let s = this.pop_state();
        if (s.ctrl & TileState.setrow) {this.row = s.row;}
        if (s.ctrl & TileState.setcol) {this.column = s.column;}
        if (s.ctrl & TileState.setplayer) {
          this.player = s.player;
        }
        if (s.ctrl & TileState.setissafe) {
          this.is_safe = s.is_safe;
        }
        if (s.ctrl & TileState.setplayerhandidx) {
          // NOTE - this state MUST ALWAYS be in place and always be at [0]
          this.states.push(s);
        }
      }
      else ret_val = false;
    }
    return ret_val;
  }

  push_state(state) {
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i].is_equal(state)) {
        return;
      }
    }
    this.states.push(state);
  }

  pop_state() {
    return this.states.pop();
  }

  static last_id = 0;
  static RECT_POSITION = 0;
  static TEXT_POSITION = 1;

  // static tile_trash = [];
  static BLANK_TILE = " ";

  static TileState = TileState;

  static in_pool = 0;
  static in_hand = 1;
  static on_board = 2;
  // static trashed = 4;
  static is_blank = 8;
  // static is_magic_s = 16;
  static utilized = 32;

  static new_tile_json(json, player) {
    let t = new Tile(json.id, json.char, json.points, json.is_safe, json.row,
      json.column, json.status, player);
    t.word_id = json.word_id;
    t.player_hand_idx = json.player_hand_idx;
    t.player = player;

    return t;
  }

  static init_Tile(game) {
    game.played_tiles = [];
    game.tile_pool = [];
    game.tile_defs = new TileDefs();
    var tmp_tile_defs = new TileDefs();

    var tmp_count = 0;
    for (let i = 0; i < tmp_tile_defs.defs.length; i++) {
      tmp_count += tmp_tile_defs.defs[i].count;
    }

    var min = 0;
    var max = (tmp_tile_defs.defs.length - 1);
    var t = null;

    // DEBUG: remove this line!!!
    // tmp_count = 17;

    while (tmp_count != 0) {
      var rand_idx = Math.floor(Math.random() * (max - min)) + min;

      if (tmp_tile_defs.defs[rand_idx].count != 0) {
        tmp_tile_defs.defs[rand_idx].count--;
        tmp_count--;
        t = new Tile(0, tmp_tile_defs.defs[rand_idx].char,
          tmp_tile_defs.defs[rand_idx].points, tmp_tile_defs.defs[rand_idx].is_safe, -1, -1, Tile.in_pool,
          null);
        if (t.char == Tile.BLANK_TILE) t.status = Tile.is_blank;
        game.tile_pool.push(t);
      }

      else {
        tmp_tile_defs.defs.splice(rand_idx, 1);
        max = (tmp_tile_defs.defs.length - 1);
      }
    }
    logger.info("Tile initialised");
  }

  static clear_adjacencies(game, t) {
    if (t.left) {
      t.left.right = null;
      t.left = null;
    }
    if (t.right) {
      t.right.left = null;
      t.right = null;
    }
    if (t.up) {
      t.up.down = null;
      t.up = null;
    }
    if (t.down) {
      t.down.up = null;
      t.down = null;
    }
    // if it's already in the game.played_tiles
    // remove it
    let idx = game.played_tiles.findIndex( tile => {
      return tile.id == t.id;
    });
    if (idx > -1) {
      game.played_tiles.splice(idx, 1);
    }
  }

  static set_adjacencies(game, t) {
    let r = game.played_tiles.filter(tile => {
      return ((tile.column == t.column - 1 ||
                tile.column == t.column + 1 ) &&
                tile.row == t.row) ||
             (tile.column == t.column &&
               (tile.row == t.row - 1 ||
                tile.row == t.row + 1))
       });
    if (r && r.length > 0) {
      for (let i = 0; i < r.length; i++) {
        if (r[i].row == t.row && r[i].column == t.column -1) {
          r[i].right = t;
          t.left = r[i];
        }
        else if (r[i].row == t.row && r[i].column == t.column +1) {
          r[i].left = t;
          t.right = r[i];
        }
        else if (r[i].column == t.column && r[i].row == t.row -1) {
          r[i].down = t;
          t.up = r[i];
        }
        else if (r[i].column == t.column && r[i].row == t.row +1) {
          r[i].up = t;
          t.down = r[i];
        }
      }
    }
  }

}

exports.Tile = Tile;
