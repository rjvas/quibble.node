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

    this.connect = [];
    this.setup_socket();
  }

  setup_socket() {
    // Now set up the WebSocket seerver
    const WebSocket = require('ws');
    const ws_server = new WebSocket.Server({
      port: this.port
    });

    // this holds a connection for each player

    // socket call backs - .on fires ONLY on the inital connection or if
    // the player refreshes the page. If a refresh occurs the original socket
    // is deleted and a new socket created and 'pushed'.
    ws_server.on('connection', function(socket) {
      this.connect.push(socket);

      // Both players requests for updates wind up here and are distinguished
      // by the current_player. CurrentGame processes the request info and then
      // returns the new state of play in 'resp_data' which is then vectored to
      // both sockets.
      socket.on('message', function(msg) {
        let player = this.game.current_player;
        var play_data = JSON.parse(msg);
        let resp_data = this.game.finish_the_play(player, play_data);
        console.log("socket message: " + resp_data);
        this.connect.forEach(s => s.send(resp_data));
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        this.connect = this.connect.filter(s => s !== socket);
      });
    });
  }

  static current_port = 26101;

  static none = -1;
  static in_play = 1;
  static finished = 2;
  static waiting = 4;
  static invited = 8;
  static admin = 16;
  static practice = 32;
}

exports.ActiveGame = ActiveGame;
