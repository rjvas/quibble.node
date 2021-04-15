var Game = require('./game').Game;

class ActiveGame {

  constructor(user1, user2, status) {
    this.game = new Game();
    this.user1 = user1;
    this.user2 = user2;
    this.status = status;
    this.port = ActiveGame.current_port++;

    if (this.user1) {
      this.game.player_1.name = this.user1.display_name;
    }
    if (this.user2) {
      this.game.player_2.name = this.user2.display_name;
    }

    this.connects = [];
    this.ws_server = this.setup_socket();
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
          console.log("socket message: " + resp_data);
          a_game.ws_server.clients.forEach(s => s.send(resp_data));
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        let a_game = ActiveGame.all_active.find(g => {
          return g.ws_server.clients.has(this);
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
