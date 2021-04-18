var Game = require('./game').Game;
const db = require('./db');

class ActiveGame {

  constructor(user1, user2, status) {
    this.user1 = user1;
    this.user2 = user2;

    this.status = status;
    this.port = ActiveGame.current_port++;

    this.game = new Game(null, user1.display_name, user2.display_name);
    this.name = this.game.name_time;

    this.game_id = null;

    this.connects = [];
    this.ws_server = this.setup_socket();
  }

  save() {
    let agame_result = null;
    let a_game_js = null;
    let game_js =  this.game.get_JSON();
    let q = { name_time : game_js.name_time };
    let update =
      { $set:  game_js};
    const options = { upsert: true };
    var result = db.get_db().collection("games").updateOne(q, update, options)
      .then((result) => {
        if (result) {
          a_game_js = this.get_JSON();
          a_game_js.game_id = result.upsertedId._id;
          q = { name: a_game_js.name };
          update = {$set : a_game_js};
          return agame_result = db.get_db().collection("active_games").updateOne(q, update, options)
        }
      })
      .then((agame_result) => {
        console.dir(agame_result);
      })
      .catch((e) => {
        console.error(e);
      });

    console.dir(agame_result);
  }

  get_JSON() {
    return {
      "name" : this.name,
      "game_id" : this.game_id,
      "user1_id" : this.user1.id,
      "user2_id" : this.user2.id,
      "status" : this.status,
    }
  }

  setup_socket() {
    // Now set up the WebSocket seerver
    const WebSocket = require('ws');
    let ws_server = new WebSocket.Server({
      port: this.port
    });

    // socket call backs - .on fires ONLY on the inital connection or if
    // the player refreshes the page. If a refresh occurs the original socket
    // is deleted and a new socket created and 'pushed'.
    ws_server.on('connection', function(socket) {

      // Both players requests for updates wind up here and are distinguished
      // by the current_player. CurrentGame processes the request info and then
      // returns the new state of play in 'resp_data' which is then vectored to
      // both sockets.
      socket.on('message', function(msg) {
        let a_game = ActiveGame.all_active.find(g => {
          return g.ws_server.clients.has(socket);
        });
        if (a_game) {
          let player = a_game.game.current_player;
          var play_data = JSON.parse(msg);
          let resp_data = a_game.game.finish_the_play(player, play_data);
          a_game.ws_server.clients.forEach(s => s.send(resp_data));
          console.log("<socket.msg> port: " + a_game.port + " player: " + player.name);
          // console.log("socket message: " + resp_data);
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        let a_game = ActiveGame.all_active.find(g => {
          return g.ws_server.clients.has(socket);
        });
        // if (a_game)
        //   a_game.connects = a_game.connects.filter(s => s !== socket);
      });
    });

    return ws_server;
  }

  static current_port = 26101;

  static none = -1;
  static in_play = 1;
  static finished = 2;
  static waiting = 4;
  static invited = 8;
  static admin = 16;
  static practice = 32;

  static all_active = [];
}

exports.ActiveGame = ActiveGame;
