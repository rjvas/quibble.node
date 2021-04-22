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

  revert_state(game, play) {
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
          Tile.clear_adjacencies(game, this);
          // this.svg.setAttributeNS(null, 'transform', "");
          // this.drag = this.drag.position();
          this.player.tiles[this.player_hand_idx] = this;
          // make sure it has default 'is_safe'
          let def = game.tile_defs.defs.find(item => {
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

  // static tile_trash = [];
  static BLANK_TILE = " ";

  static TileState = TileState;

  static new_tile_json(json, player) {
    let t = new Tile(json.id, json.char, json.points, json.is_safe, json.row,
      json.column, player);
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

    // TODO: the randomization here is stupid - make it better
    while (tmp_count != 0) {
      var rand_idx = Math.floor(Math.random() * (max - min)) + min;

      if (tmp_tile_defs.defs[rand_idx].count != 0) {
        tmp_tile_defs.defs[rand_idx].count--;
        tmp_count--;
        t = new Tile(0, tmp_tile_defs.defs[rand_idx].char,
          tmp_tile_defs.defs[rand_idx].points, tmp_tile_defs.defs[rand_idx].is_safe, -1, -1, null);
        game.tile_pool.push(t);
      }

      else {
        tmp_tile_defs.defs.splice(rand_idx, 1);
        max = (tmp_tile_defs.defs.length - 1);

        // Getting hits is less and less likely as the counts go to 0. If the
        // tmp_count is less than 15 just stuff the rest in the tile_pool
        // if (tmp_count < 15) {
        //   for (let i = 0; i < tmp_tile_defs.defs.length; i++) {
        //     while (tmp_tile_defs.defs[i].count > 0) {
        //       tmp_tile_defs.defs[i].count--;
        //       game.tile_pool.push(new Tile(0, tmp_tile_defs.defs[i].char,
        //         tmp_tile_defs.defs[i].points, tmp_tile_defs.defs[i].is_safe, -1, -1, null));
        //     }
        //   }
        //   break;
        // }
      }
    }
    console.log("Tile initialised");
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
