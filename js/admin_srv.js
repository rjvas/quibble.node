var Game = require('./game').Game;
const db = require('./db');
var logger = require('./log').logger;

class Admin {
  constructor (user, current_users) {
    this.user = user;
    this.port = Admin.current_port--;
    this.ws_server = this.setup_socket();
    Admin.active_admins.push(this);
    Admin.current_users = current_users;
  }

  static current_port = 26100;
  static active_admins = [];
  static current_users = null;
  static db_users = [];

  logout(user) {
    Admin.active_admins = Admin.active_admins.filter(a => a.port != user.admin.port);
  }

  get_user_data(user_name) {
    let ret_data = [];
    let active = Admin.current_users.find(u => {
      return u.user_name == user_name;
    });
    if (active) {
      // use in-memory data
      ret_data.push({
        "user" : active.get_JSON(),
        "saved_games" : active.get_saved_game_list(),
        "active_games" : active.get_a_game_list()
      });
    }
    else {
      // read from db
    }

    return ret_data;
  }

  setup_socket() {
    // Now set up the WebSocket seerver
    const WebSocket = require('ws');
    let server = new WebSocket.Server({
      port: this.port
    });

    // socket call backs - .on fires ONLY on the inital connection or if
    // the player refreshes the page. If a refresh occurs the original socket
    // is deleted and a new socket created and 'pushed'.
    server.on('connection', function(socket) {

      // Both players requests for updates wind up here and are distinguished
      // by the current_player. CurrentGame processes the request info and then
      // returns the new state of play in 'resp_data' which is then vectored to
      // both sockets.
      socket.on('message', function(msg) {
        let admin = Admin.active_admins.find(a => {
          return a.ws_server.clients.has(socket);
        });
        if (admin) {
          var ret_data = null;
          var data = JSON.parse(msg);
          if (data[0].change_user) {
            // get user's data
            ret_data = JSON.stringify(admin.get_user_data(data[0].change_user));
          }
          // let resp_data = a_game.game.finish_the_play(user, user_data);
          // let data = JSON.stringify(resp_data);
          // Admin.server.clients.forEach(s => s.send(data));
          admin.ws_server.clients.forEach(s => s.send(ret_data));
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        // a_game.connects = a_game.connects.filter(s => s !== socket);
      });
    });

    return server;
  }

}

exports.Admin = Admin;
