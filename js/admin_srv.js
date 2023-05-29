/*  Copyright 2021 Richard Vassilaros 
*/
const db = require('./db');
// const { User } = require('./user');
var logger = require('./log').logger;
const quib_cfg = require('./quib_config.json');
const {exec} = require('child_process');

class Admin {
  constructor (user, current_users) {
    this.user = user;
    this.port = Admin.current_port > Admin.port_min ? Admin.current_port-- : Admin.port_max;
    this.ws_server = this.setup_socket();
    Admin.active_admins.push(this);
    Admin.current_users = current_users;
  }

  static port_min = !quib_cfg.staging ? 25900 : 35900;
  static port_max = !quib_cfg.staging ? 26000 : 35950;
  static current_port = !quib_cfg.staging ? 26000 : 35950;
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

      console.log("admin_srv.socket connected: ");
      logger.debug("admin_srv.socket connected: ");

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

          } else if (data[0].logout_user) {

          }  else if (data[0].save_user) {
            let props = data[0].save_user;
            let ufound = Admin.current_users.find(u => {
              return u.id.toHexString() == props.id; 
            });

            if (ufound) {
              // TODO need to resolve circular dependency to get at User static role values
              ufound.role = props.role_player ? 1 : 0;
              props.role_admin ? ufound.role |= 2 : ufound.role;

              ufound.display_name = props.display_name;
              ufound.email = props.email;
              ufound.failed_login_count = props.failed_login_count;
              ufound.last_lockout_date = props.last_lockout;
              ufound.last_login_date = props.last_login;

              ufound.save();
            }

          } else if (data[0].delete_user) {

          } else if (data[0].active_players_email_subj) {
            let body = data[0].active_players_email_body;
            let subj = data[0].active_players_email_subj;
            let to = [];
            
            Admin.current_users.forEach(u => { to.push(u.email); });

            let cmd = `mail -s "${subj}" ${to.join(",")} -b ${quib_cfg.sys_email_addr} <<< '${body}'`; 

            try {
              exec(cmd, (err, stdout, stderr) => {
                if (err) {
                  data[0].info = "Error executing: " + cmd;
                  socket.send(JSON.stringify(data));
                  console.error(err)
                } else {
                  // the *entire* stdout and stderr (buffered)
                  if (stdout) {
                    data[0].info = cmd + " successful " + stdout;
                    socket.send(JSON.stringify(data));
                }
                console.log(`${cmd} stdout: ${stdout}`);
                console.log(`${cmd} stderr: ${stderr}`);
                }
              });
            } catch(error) {
                data[0].info = "Error executing: " + cmd;
                socket.send(JSON.stringify(data));
                console.error(error)
            }

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
        console.log("admin_srv.socket closed: ");
        logger.debug("admin_srv.socket closed: ");
      });
    });

    return server;
  }

}

exports.Admin = Admin;
