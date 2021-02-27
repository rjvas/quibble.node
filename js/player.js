var Tile = require('./tile').Tile;

/*
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var PlayerSchema = new Schema(
  {
    game_id: {type: Schema.Types.ObjectId, ref: 'Game', required: true},
    player: {type: Schema.Types.ObjectId, ref: 'Player', required: true},
    tiles: [{type: Schema.Types.ObjectId, ref: 'Tile', required: true}],
  }
);


//Export model
module.exports = mongoose.model('Play', PlaySchema);
*/

class Player {
  constructor (id, name, tile_color_risky, tile_color_safe, total_points) {
    if (id > 0) {
      this.id = id;
      Player.current_id = Math.max(id, Player.current_id);
    }
    else {
      this.id = ++Player.current_id;
    }
    this.name = name;
    this.tiles = [];
    this.tile_color_risky = tile_color_risky;
    this.tile_color_safe = tile_color_safe;
    this.start = null;
    this.total_points =  total_points;
    this.trade_tiles_count = 0;
    // this.update_hand(true, null);
  }

  update_hand(initial, play) {
    // this does not hit the 'magic' s - get that after
    var ret_val = [];
    for(let i= 0; i < Player.num_player_tiles; i++) {
      if (this.tiles[i] == null) {
        let t = Tile.get_random_tile();
        if (!t) return false; //Game.current_game.end_the_game();
        else {
          t.setup_for_play(this, i, play);
          ret_val.push(t.get_JSON());
          console.log("in player.update_hand new tile: " + t.char);
        }
      }
      else {
        // for tiles in the player hand, ensure that the tile state has the current play
        let tile = this.tiles[i];
        if (tile) {
          tile.fixup_tilestates(play);
          console.log("in player.update_hand existing tile: " + tile.char);
        }
      }
    }

    // Case of the Extra 'S' Tile
    if (this.tiles.length == Player.num_player_tiles + 1) {
      // gotta get rid of the extra tile position
      if (this.tiles[this.tiles.length - 1] == null )
        this.tiles.pop();
      else {
        // for tiles in the player hand, ensure that the tile state has the current play
        let tile = this.tiles[this.tiles.length - 1];
        if (tile) tile.fixup_tilestates(play);
      }
    }

    if (initial) {
      let tile = Tile.get_tile("S");
      if (tile) tile.setup_for_play(this, Player.num_player_tiles);
    }

    return ret_val;
  }

  static max_tile_trade = 3;
  static current_id = 0;
  static num_player_tiles = 7;
}

exports.Player = Player;
