/*
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var PlaySchema = new Schema(
  {
    game_id: {type: Schema.Types.ObjectId, ref: 'Game', required: true},
    player: {type: Schema.Types.ObjectId, ref: 'Player', required: true},
    tiles: [{type: Schema.Types.ObjectId, ref: 'Tile', required: true}],
  }
);
*/
var Tile = require ('./tile').Tile;

class Play {
  constructor (id, player) {
    if (id > 0) {
      this.id = id;
      Play.current_id = Math.max(id, Play.current_id);
    }
    else {
      this.id = ++Play.current_id;
    }
    this.player = player;
    this.tiles = [];
  }

  get_JSON() {
    return {
      "id" : this.id,
      "player" : this.player.id,
      "tiles" : this.get_played_JSONS()
    }
  }

  get_played_JSONS() {
    var ret_val = [];
    this.tiles.forEach((item, idx) => {
       ret_val.push(item.get_JSON());
    });
    return ret_val;
  }

  is_empty() {
    if (this.player == null || this.tiles.length == 0) {
        return true;
    }
    return false;
  }

  static current_id = 0;
  static new_play_json(js, player) {
    let p = new Play(js.id, player);
    js.tiles.forEach((item, i) => {
      p.tiles.push(Tile.new_tile_json(item, player));
    });
    return p;
  }
}

exports.Play = Play;
