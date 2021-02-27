var TileState = require('./tileState').TileState;
var TileDefs = require('./tileDefs').TileDefs;

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
  constructor (id, char, points, safe, row, column, player) {
    if (id != 0) {
      this.id = id;
      Tile.last_id = Math.max(id, Tile.last_id);
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
      "col" : this.column,
      "fill" : fill,
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
          // this.is_safe ? this.set_tile_color(this.player.tile_color_safe) :
          //   this.set_tile_color(this.player.tile_color_risky);
        }
        if (s.ctrl & TileState.setissafe) {
          this.is_safe = s.is_safe;
          // update the graphics
          // this.is_safe ? this.set_tile_color(this.player.tile_color_safe) :
          //   this.set_tile_color(this.player.tile_color_risky);
        }
        if (s.ctrl & TileState.setplayerhandidx) {
          // stuff it back in the player hand
          this.row = -1;
          this.column = -1;
          Tile.clear_adjacencies(this);
          // this.svg.setAttributeNS(null, 'transform', "");
          // this.drag = this.drag.position();
          this.player.tiles[this.player_hand_idx] = this;
          // make sure it has default 'is_safe'
          let def = Tile.tile_defs.defs.find(item => {
            return item.char == this.char;
          });
          def ? this.is_safe = def.is_safe : this.is_safe = false;

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

  set_tool_tips(words) {
    // let tile_rect = this.svg.childNodes[Tile.RECT_POSITION];
    // tile_rect.setAttributeNS(null, 'class', "tooltip")
    // this.svg.setAttributeNS(null, 'class', "tooltip")
    // this.svg.childNodes[Tile.TEXT_POSITION].setAttributeNS(null, 'class', 'tooltiptext');
    // this.svg.childNodes[Tile.TEXT_POSITION].setAttributeNS(null, 'innerHTML', words);
    // this.svg.childNodes[Tile.TEXT_POSITION].append("<title>A blue box</title>");
    // this.svg.childNodes[Tile.RECT_POSITION].append("<title>A blue box</title>");
  }

  static last_id = 0;
  static RECT_POSITION = 0;
  static TEXT_POSITION = 1;

  static played_tiles = [];

  static tile_pool = [];
  static total_tile_count = 0;
  // static tile_trash = [];
  static tile_defs = null;
  static BLANK_TILE = " ";

  static TileState = TileState;

  static init_Tile() {
    Tile.played_tiles = [];
    Tile.tile_pool = [];
    Tile.total_tile_count = 0;
    Tile.tile_defs = new TileDefs();

    for (let i = 0; i < Tile.tile_defs.defs.length; i++) {
      Tile.total_tile_count += Tile.tile_defs.defs[i].count;
    }

    var tmp_count = Tile.total_tile_count;
    var min = 0;
    var max = (Tile.tile_defs.defs.length - 1);
    var t = null;

    // TODO: the randomization here is stupid - make it better
    while (tmp_count != 0) {
      var rand_idx = Math.floor(Math.random() * (max - min)) + min;

      if (Tile.tile_defs.defs[rand_idx].count != 0) {
        Tile.tile_defs.defs[rand_idx].count--;
        tmp_count--;
        t = new Tile(0, Tile.tile_defs.defs[rand_idx].char,
          Tile.tile_defs.defs[rand_idx].points, Tile.tile_defs.defs[rand_idx].is_safe, -1, -1, null);
        Tile.tile_pool.push(t);
      }

      else {
        // Getting hits is less and less likely as the counts go to 0. If the
        // tmp_count is less than 15 just stuff the rest in the tile_pool
        if (tmp_count < 15) {
          for (let i = 0; i < Tile.tile_defs.defs.length; i++) {
            while (Tile.tile_defs.defs[i].count > 0) {
              Tile.tile_defs.defs[i].count--;
              Tile.tile_pool.push(new Tile(0, Tile.tile_defs.defs[i].char,
                Tile.tile_defs.defs[i].points, Tile.tile_defs.defs[i].is_safe, -1, -1, null));
            }
          }
          break;
        }
      }
    }
    console.log("Tile initialised");
  }

  static get_tile(char) {
    var ret_val = null;
    var idx = Tile.tile_pool.findIndex(t => {
      return t.char == char;
    });
    // decrement the total count - need to know when we're out
    Tile.total_tile_count--;
    ret_val = Tile.tile_pool[idx];
    // remove that tile from the pool
    Tile.tile_pool.splice(idx, 1);
    return ret_val;
  }

  static get_random_tile() {
    var ret_val = null;
    var min = 0;
    var max = Tile.tile_pool.length - 1;
    var rand_idx = Math.floor(Math.random() * (max - min)) + min;
    ret_val = Tile.tile_pool[rand_idx];
    // decrement the total count - need to know when we're out
    Tile.total_tile_count--;
    // remove that tile from the pool
    Tile.tile_pool.splice(rand_idx, 1);
    return ret_val;
  }

  static clear_adjacencies(t) {
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
    // if it's already in the Tile.played_tiles
    // remove it
    let idx = Tile.played_tiles.findIndex( tile => {
      return tile.id == t.id;
    });
    if (idx > 0) {
      Tile.played_tiles.splice(idx, 1);
    }
  }

  static set_adjacencies(t) {
    let r = Tile.played_tiles.filter(tile => {
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
