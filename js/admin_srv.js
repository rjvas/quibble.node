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
  static active_games = null;

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
            admin.ws_server.clients.forEach(s => s.send(ret_data));

          } else if (data[0].get_active_game) {
            // find the active game that has a specific port # 
            let agame_name = data[0].get_active_game;
            if (agame_name) { 
              let ag = Admin.active_games.find(ag => {
                return ag.name == agame_name;
              })

              // found the game - jsonify it and send it back
              if (ag) {
                let json = {
                  "type" : "view_game_json",
                  "agame" : ag.get_JSON(),
                  "game" : ag.game.get_JSON()
                }
                admin.ws_server.clients.forEach(s => s.send(JSON.stringify(json)));
              }
            }
          }
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
      });
    });

    return server;
  }

}

exports.Admin = Admin;
