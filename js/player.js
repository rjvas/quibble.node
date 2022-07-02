var Tile = require('./tile').Tile;
var logger = require('./log').logger;

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
  constructor (id, name, tile_color_risky, tile_color_safe, total_points, safe_points) {
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
    this.safe_points =  safe_points;
    this.trade_tiles_count = 0;
    // this.update_hand(true, null);
    this.max_tile_trade = 3;
}

  get_JSON() {
    return {
      "id" : this.id,
      "name" : this.name,
      "tile_color_risky" : this.tile_color_risky,
      "tile_color_safe" : this.tile_color_safe,
      "total_points" : this.total_points,
      "safe_points" : this.safe_points,
      "trade_tiles_count" : this.trade_tiles_count,
      "max_tile_trade" : this.max_tile_trade,
      "tiles" : this.get_tiles_JSON()
    }
  }

  get_tiles_JSON() {
    var ret_val = [];
    this.tiles.forEach((item, idx) => {
      let js = item ? item.get_JSON() : null;
      if (js) ret_val.push(js);
    });
    return ret_val;
  }

  update_hand(game, initial, play, jsons) {
    var ret_val = true;
    if (!jsons) jsons = [];

    for(let i= 0; i < Player.num_player_tiles; i++) {
      if (this.tiles[i] == null) {
        let t = game.get_random_tile();
        if (t) {
          t.setup_for_play(this, i, play);
          jsons.push(t.get_JSON());
          logger.info("in player.update_hand new tile: " + t.char);
        }
        else ret_val = false; // unable to fulfill the tile request
      }
      else {
        // for tiles in the player hand, ensure that the tile state has the current play
        let tile = this.tiles[i];
        if (tile) {
          tile.fixup_tilestates(play);
          logger.info("in player.update_hand existing tile: " + tile.char);
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

    // if (initial) {
    //   let tile = game.get_tile("S");
    //   if (tile) {
    //     tile.setup_for_play(this, Player.num_player_tiles);
    //     tile.status |= Tile.is_magic_s;
    //   }
    // }

    return ret_val;
  }

  get_tile_count() {
    var count = 0;
    this.tiles.forEach((item, i) => {
      if (item) count++;
    });
    return count;
  }

  get_hand_JSONS() {
    var jsons = [];
    this.tiles.forEach((item, i) => {
      if (item)
        jsons.push({
            "id" : item.id,
            "char" : item.char,
            "points" : item.points,
            "is_safe" : item.is_safe,
            "row" : item.row,
            "col" : item.column,
            "player_hand_idx" : item.player_hand_idx
          });
    });
    return jsons;
  }

  static current_id = 0;
  static num_player_tiles = 7;

  static new_player_json(json) {
    let p = new Player(json.id, json.name, json.tile_color_risky,
      json.tile_color_safe, json. total_points, json.safe_points ? json.safe_points : 0);
    p.trade_tiles_count = json.trade_tiles_count;
    p.max_tile_trade = json.max_tile_trade;
    json.tiles.forEach((item, i) => {
      p.tiles.push(Tile.new_tile_json(item, p));
    });
    return p;
  }

}

exports.Player = Player;
