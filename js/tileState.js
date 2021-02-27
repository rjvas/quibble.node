/*
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TileStateSchema = new Schema(
  {
    x: {type: Integer, required: false},
    y: {type: Integer, required: false},
    row: {type: Integer, required: false, default: -1},
    column: {type: Integer, required: false, default: -1},
    is_safe: {type: boolean, required: true, default: false},

    ctrl: {type: Integer, required: true},
    in_play_id: {type: Schema.Types.ObjectId, ref: 'Play', required: true},
    tile_id: {type: Schema.Types.ObjectId, ref: 'Tile', required: true},
  }
);


//Export model
module.exports = mongoose.model('TileState', TileStSchema);
*/


class TileState{
  constructor(tile, ctrl, play) {
    // ctrl & TileState.setx ? this.x = tile.svg.getAttributeNS(null, 'x') :
    //   this.x = -1;
    // ctrl & TileState.sety ? this.y = tile.svg.getAttributeNS(null, 'y') :
    //   this.y = -1;
    ctrl & TileState.setrow ? this.row = tile.row : this.row = -1;
    ctrl & TileState.setcol ? this.column = tile.column : this.column = -1;
    ctrl & TileState.setissafe ? this.is_safe = tile.is_safe : this.is_safe = false;
    ctrl & TileState.setplayer ? this.player = tile.player : this.player = null;
    ctrl & TileState.setplayerhandidx ? this.player_hand_idx = tile.player_hand_idx :
      this.player_hand_idx = -1;

    this.ctrl = ctrl;
    this.in_play = play;
  }

  is_equal(t_state) {
    if (this.in_play == t_state.in_play &&
      this.x == t_state.x && this.y == t_state.y && this.row == t_state.row &&
        this.column == t_state.column && this.player == t_state.player &&
        this.is_safe == t_state.is_safe &&
        this.player_hand_idx == t_state.player_hand_idx &&
        this.ctrl == t_state.ctrl) {
      return true;
    }
    return false;
  }

  static setx = 1;
  static sety = 2;
  static setrow = 4;
  static setcol = 8;
  static setissafe = 16;
  static setplayer = 32;
  static setplayerhandidx = 64;
}

exports.TileState = TileState;
