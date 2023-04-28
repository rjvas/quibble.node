/*
   Copyright 2021 Richard Vassilaros 
*/

/*
The class that represents a user of the system - currently player and administrator
*/

const bcrypt = require('bcrypt');
const salt_rounds = 10;
const db = require('./db');
const { ObjectID } = require( 'mongodb' )
var logger = require('./log').logger;
var Admin = require('./admin_srv').Admin
const {exec} = require('child_process');
var System  = require('./system').System;
var Sys = null;

// debug or release, etc
const quib_cfg = require('./quib_config.json');

class User {
  constructor(sonj, server) {
    this.id = sonj._id;
    this.active = (sonj.active ? sonj.active : true);
    this.deactivate_reason = (sonj.deactivate_reason ? sonj.deactivate_reason : "none");
    this.description = (sonj.description ? sonj.description : "none");
    this.failed_login_count = (sonj.failed_login_count ? sonj.failed_login_count : 0);
    this.last_lockout_date = (sonj.last_lockout_date ? sonj.last_lockout_date : "never");
    this.last_login_date = (sonj.last_login_date ? sonj.last_login_date : Date());
    this.user_name = (sonj.user_name ? sonj.user_name : "error");
    this.display_name = (sonj.display_name ? sonj.display_name : "error");
    this.email = (sonj.email ? sonj.email : "error")
    this.password = (sonj.password ? sonj.password : "error");
    // this.roles = [].push(new UserRole(this.id, UserRole.player));
    this.role = (sonj.role ? sonj.role : User.player);
    this.status = (sonj.status ? sonj.status : User.in_play);
    this.saved_games = [];
    this.active_games = [];
    this.friends = (sonj.friends ? sonj.friends : []);
    this.admin = null;
    this.jwt = null;
    this.port = User.current_port < User.port_max ? User.current_port++ : User.port_min;
    this.connects = [];
    this.ws_server = this.setup_socket(server);
  }

  static email_regex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
  static port_min = 24101;
  static port_max = 25101;
  static current_port = 24101;

  static current_users = [];
  static pickup_gamers = [];

  // roles
  static none = -1;
  static player = 1;
  static admin = 2;

  // status
  static none = -1;
  static pickup_game = 1;
  static in_play = 2;

  get_JSON() {
    return {
      "_id" : this.id,
      "active" : this.active,
      "deactivate_reason" : this.deactivate_reason,
      "description" : this.description,
      "failed_login_count" : this.failed_login_count,
      "last_lockout_date" : this.last_lockout_date,
      "last_login_date" : this.last_login_date,
      "user_name" : this.user_name,
      "display_name" : this.display_name,
      "email" : this.email,
      "password" : this.password,
      "role" : this.role,
      "state" : this.status,
      "friends" : this.friends
    }
  }

  logout(response) {
    this.admin ? this.admin.logout(this) : this.admin = null;
    this.save();
    User.current_users = User.current_users.filter(u => !u.id.equals(this.id));
    response.writeHead(302 , {
       'Location' : '/'
    });
    response.end();
  }

  save() {
    let user_js =  this.get_JSON();
    let q = { _id : this.id };
    let update =
      { $set:  user_js};
    const options = { upsert: true };
    var result = db.get_db().collection("users").updateOne(q, update, options)
      .then((result) => {
        if (result) {
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }

  get_saved_game_list(game_over) {
    let ret_val = []; 

    this.saved_games.forEach((item, i) => {
      ret_val.push({"name" : item.name, "active" : true});
    });

    return ret_val;
  }

  get_a_game_list() {
    let ret_val = [];

    this.active_games.forEach((item, i) => {
      ret_val.push({"name" : item.name, "port" : item.port});
    });

    return ret_val;
  }

  get_game(name) {
    return this.saved_games.find(g => {return g.name == name});
  }

  get_user_page() {
    let games = this.getGameList();
    let gamers = User.get_pickup_gamers();
    return pug_user({
      'games' : games,
      'gamers' : gamers
    });
  }

  active_games_add(agame) {
    this.active_games.push(agame);
    this.send_msg("gamelist_add", agame.name);
  }

  active_games_remove(agame) {
    this.active_games = this.active_games.filter(ag => ag && ag.name == agame.name);
    this.send_msg("gamelist_remove", agame.name);
  }
  
  invite_friend(query) {
    if (!Sys) Sys = System.get_system();
    var params = new URLSearchParams(query);
    let u_name = params.get("user_name");
    let f_name = params.get("friend_name");
    let f_email = params.get("friend_email");
    let uid = this.id;
    // iid is int
    let iid = Sys.new_invitation(uid, f_name, f_email);

    if (quib_cfg.debug && quib_cfg.local) {
      console.log(`User.invite_friend: user_name=${u_name} friend_name=${f_name} friend_email=${f_email}`);
    }
    else {
      let subj = `${u_name} has invited you to play Let's Quibble!`;
      let body = `Hello ${f_name}, Let\'s Quibble is a free-to-play word game like Scr*bble only you get to capture your opponent\'s tiles and points. If you want to accept ${u_name}'s invitation click the link or copy/paste it into your browser address bar. Register for an account (no personal information is required except a valid email address) and when you login a new game will have been started between you and ${u_name}.\n\nHave fun Quibbling!\n\n`;
      body += `http://www.letsquibble.net/invitation_accept?iid=${iid}`;

      let cmd = `mail -s \"${subj}\" \"${f_email}\" -b \"letsquibble878\@gmail.com\" <<< \"${body}\"`; 

      let ret_val = false;
      try {
        ret_val = exec(cmd, (err, stdout, stderr) => {
          if (err) {
            console.log("invitation email failed");
            console.log(err);
            // rjv think about this ...
            // Sys.remove_invitation(iid);
            return false;
          } else {
            console.log("invitation email success");
            console.log(`${cmd} stdout: ${stdout}`);
            console.log(`${cmd} stderr: ${stderr}`);
            return true;
          }
        });
      } catch(error) {
          console.log("invitation email: exception error");
          console.log(error);
          // rjv think about this ...
          // Sys.remove_invitation(iid);
          return false;
      }
      return ret_val;

    }
  }

  static add_pickup_gamer(name) {
    // TODO What to do about overlap of display names?
    let gamer = User.pickup_gamers.find(g => {
      return g == name;
    });
    if (!gamer) {
      User.pickup_gamers.push(name);
      User.current_users.forEach(cu => {
        cu.send_msg("pickuplist_add", name);
      });
    }
  }

  static remove_pickup_gamer(name, challenger) {
    User.pickup_gamers = User.pickup_gamers.filter(g => g != name);
    User.current_users.forEach(cu => {
      cu.send_msg("pickuplist_remove", {"name" : name, "challenger" : challenger});
    });
  }

  static get_pickup_gamers() {
     return User.pickup_gamers;
  }

  static mail_reset(to, id) {
    let subj = "Reset <game name> password";
    let body = "Click the link or copy/paste it into your browser address bar\n\n";
    if (!quib_cfg.debug)
      body += "http://www.letsquibble.net/reset_phase2?hp=" + encodeURIComponent(id);
    else
      body += "localhost/reset_phase2?hp=" + encodeURIComponent(id);

    let cmd = `mail -s \"${subj}\" \"${to}\" <<< \"${body}\"`; 

    let ret_val = false;
    try {
      ret_val = exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.log("reset password email failed");
          console.log(err);
          return false;
        } else {
          console.log("reset password email success");
          console.log(`${cmd} stdout: ${stdout}`);
          console.log(`${cmd} stderr: ${stderr}`);
          return true;
        }
      });
    } catch(error) {
        // data[0].info = "Error executing: " + cmd;
        // socket.send(JSON.stringify(data));
        console.log("mail_reset: exception error");
        console.log(error);
        return false;
    }
	  return ret_val;
  }

  static reset_phase1(query, response) {
    var params = new URLSearchParams(query);
    let name = params.get("username");
    let email = params.get("email");

    let id;
    let dbq = { $and: [
          { "user_name": name},
          { "email" : email} ]}; 
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
            if (User.mail_reset(email, usr.password)) 
              response.writeHead(302 , {'Location' : '/reset_phase1?err=mail_success'});
            else 
              response.writeHead(302 , {'Location' : '/reset_phase1?err=mail_failed'});
          } 
        else {
            response.writeHead(302 , {'Location' : '/reset_phase1?err=error_no_user'});
        }
        response.end();
      })
      .catch((e) => console.error(e));
  }

  static reset_phase2(hp, tmpl, response) {
    let dbq = ({ "password": hp});
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
          response.end(tmpl);
        } 
        else {
            response.writeHead(302 , {
                'Location' : '/reset_phase2?err=error_no_user'});
            response.end();
        }
      })
      .catch((e) => console.error(e));
  }

  static reset_phase3(query, hp, response) {
    // get the original hashed password from the referer for lookup
    var q_params = new URLSearchParams(query);
    let pass1 = q_params.get("password");
    let pass2 = q_params.get("password2");

    let dbq = ({ "password": hp});
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
          let user_name = usr.user_name;
            let salt = bcrypt.genSaltSync(salt_rounds);
            let pw_hashed = bcrypt.hashSync(pass1, salt);
            const q = { user_name: usr.user_name };
            const update =
              { $set:  { "user_name": user_name, "password" : pw_hashed}};
            const options = { upsert: true };
            db.get_db().collection('users').updateOne(q, update, options)
              .then(res => {
                response.writeHead(302 , { 'Location' : '/reset_phase3?err=error_success' });
                response.end();
              })
              .catch((e) => {
                console.error(e);
              });
          }
      })
      .catch((e) => console.error(e));
  }

  static load_user(user_id) {
    let dbq = { "_id" : user_id };
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
          console.log("blah");
        }
      })
      .catch((e) => console.error(e));
    return usr;
  }

  static async login (server, query, request_addr, user_agent, response, act_game) {
    if (!Sys) Sys = System.get_system();
    let game_over = act_game.game_over;
    var new_user = null;
    var params = new URLSearchParams(query);
    let name = params.get("username");
    let passw = params.get("password");
    let invite_id = params.get("invitation_id");

    let logged_in = User.current_users.find(u => {
      return u.user_name == name;
    });

    if (logged_in && (user_agent == "dbcgAndroid" || user_agent == "dbcgIphone")) {
      let jsons = [];
      logged_in.last_login_date = Date();
      jsons.push({"user" : logged_in.id.toHexString()});
      jsons.push({"games" : logged_in.saved_games});
      response.writeHead(201 , { 'Content-Type' : 'text/json' });
      response.end(JSON.stringify(jsons));
      return;
    }

    else if (logged_in) {
      if (bcrypt.compareSync(passw, logged_in.password)) {
        // After accepting an invitation need to setup new game for inviter and invitee
        let invite = null;
        if (invite_id && (invite = Sys.get_invitation(parseInt(invite_id)))) { 
          act_game.new_invite_agame(invite, logged_in);
        }
        logger.warn("User.login warning - " + name + "has multiple logins");
        response.writeHead(302 , { 'Location' : `/home_page?iid=${invite_id}&user=${logged_in.id.toHexString()}` });
      }
      else {
        logger.error("User.login error - " + name + " is already logged in");
        response.writeHead(302 , { 'Location' : `/?err=error_login` });
      }
      response.end();
      return;
    }

    let dbq = { "user_name": name };
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
          if (bcrypt.compareSync(passw, usr.password)) {
            new_user = new User(usr, server);
            new_user.save();
            new_user.last_login_date = Date();
            User.current_users.push(new_user);
            if (new_user.role & User.admin) {
              // give Admin a reference to all the active users
              new_user.admin = new Admin(new_user, User.current_users);
            }

            // Invitations: the logic is - it this is an invitation fulfillment then build a
            // new game and force its save before querying for the user's
            // active games. Otherwise, just query the active games.
            let invite = null;       
            let agame = null;
            if (invite_id && (invite = Sys.get_invitation(parseInt(invite_id)))) { 
              // After accepting an invitation need to setup new game for inviter and invitee
              return act_game.new_invite_agame(invite, new_user)
                .then(() => {
                  Sys.remove_invitation(invite.id);
                  Sys.save();
                  dbq = { $or: [ { "user1_id": new_user.id }, { "user2_id": new_user.id } ] };
                  return db.get_db().collection('active_games').find(dbq)
                })
              }
              else {
                dbq = { $or: [ { "user1_id": new_user.id }, { "user2_id": new_user.id } ] };
                return db.get_db().collection('active_games').find(dbq)
              }

          } else {
            logger.error("login error - " + name + "wrong password");
            response.writeHead(302 , {
               'Location' : `/?err=error_password&iid=${invite_id}`
            });
            response.end();
          }
        }
        else {
          logger.error("login error - no user with: " + name + "/" + passw);
          response.writeHead(302 , {
             'Location' : `/?err=error_password&iid=${invite_id}`
          });
          response.end();
        }

      }).then(result => {
        return result.toArray();

      }).then(result => {
        if (new_user) {
          // filter out any 'game_over' games
          new_user.saved_games = result.filter(ag => {
            return !(ag.status & game_over);
          });
          if (user_agent == "dbcgAndroid" || user_agent == "dbcgIphone") {
            let jsons = [];
            jsons.push({"user" : new_user.id.toHexString()});
            jsons.push({"games" : new_user.saved_games});
            response.writeHead(201 , { 'Content-Type' : 'text/json' });
            response.end(JSON.stringify(jsons));
          } else {
            response.writeHead(302 , {
              'Location' : '/home_page?user=' + new_user.id.toHexString()
            });
            response.end();
          }
        }
      })

      .catch((e) => console.error(e));
  }

  static register(query, response) {
    if (!Sys) Sys = System.get_system();
    var params = new URLSearchParams(query);
    let user_name = params.get("username");
    let display_name = params.get("displayname")
    let passw = params.get("password");
    let passw2 = params.get("password2");
    let email = params.get("email");
    let invite_id = params.get("invitation_id");
    let register_err = false;

    // passwords don't match - error and try again
    if (passw != passw2) {
      register_err = true;
      logger.error("registration error - " + "passwords do NOT match - please try again");
      response.writeHead(302 , {
          'Location' : '/?err=error_reg_pass'
      });
      response.end();
    }
    else if (!email) {
      register_err = true;
      logger.error("registration error - " + "please enter email");
      response.writeHead(302 , {
          'Location' : '/?err=error_reg_email'
      });
      response.end();
    }
    else if (!User.email_regex.test(email)) {
      register_err = true;
      logger.error("registration error - " + "please enter properly formatted email");
      response.writeHead(302 , {
          'Location' : '/?err=error_reg_email'
      });
      response.end();
    }
    else if (!display_name) {
      register_err = true;
      logger.error("registration error - " + "please enter display name");
      response.writeHead(302 , {
          'Location' : '/?err=error_reg_display_name'
      });
      response.end();
    }

    if (register_err) return;

    // check for existing user_name
    let dbq = { "user_name": user_name };
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
          logger.error("registration error - " + user_name + " already registered - either choose a unique user name or login");
          response.writeHead(302 , {
              'Location' : '/?err=error_reg_prior'
          });
          response.end();
        }
        else {
          let salt = bcrypt.genSaltSync(salt_rounds);
          let pw_hashed = bcrypt.hashSync(passw, salt);
          const q = { user_name: user_name };
          const update =
            { $set:  { "user_name": user_name, "display_name" : display_name, "password" : pw_hashed, "email" : email }};
          const options = { upsert: true, returnOriginal: true };
          return db.get_db().collection('users').updateOne(q, update, options)
            .then(res => {
              let new_user_id = res.result.upserted[0]._id;
              // is this an invitation response? if so, setup to build new game ...
              if (invite_id) {
                let invite = Sys.get_invitation(parseInt(invite_id));
                if (invite) invite.invitee_id = new_user_id;
              }
              response.writeHead(302 , {
                'Location' : `/?err=error_reg_success&iid=${invite_id}&new_uid=${new_user_id.toHexString()}`
              });
              response.end();
              return Sys.save();
            })
            .catch((e) => {
              console.error(e);
            });
        }
      })
      .catch((e) => console.error(e));
  }

  send_msg(type, info) {
    let data = [];
    data.push({"type" : type});
    data.push({"data" : info});

    this.ws_server.clients.forEach(s => s.send(JSON.stringify(data)));

    logger.debug("user.send_msg: type: message data: " + JSON.stringify(data));
  }

  setup_socket(server) {
    // Now set up the WebSocket seerver
    const WebSocket = require('ws');
    let ws_server = new WebSocket.Server({
      // server: server
      port: this.port
    });

    // socket call backs - .onconnection fires ONLY on the inital connection or if
    // the player refreshes the page. If a refresh occurs the original socket
    // is deleted and a new socket created and 'pushed'
    ws_server.on('connection', function(socket) {

      socket.on('message', function(msg) {
        let user = User.current_users.find(u => {
          return u && u.ws_server && u.ws_server.clients && 
            u.ws_server.clients.has(socket);
        });
        if (user) {
          let resp_data = null;
          let player = a_game.game.current_player;
          var play_data = JSON.parse(msg);
          let player_name = "";

          let type = play_data[0] && play_data[0].type ? play_data[0].type :
            "unknown"; 
        }

      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        console.log("user.socket.on.close");
        logger.debug("user.socket.on.close");
      });
    });

    return ws_server;
  }
}

class UserRole {
  constructor(user_id, role) {
    this.id = -1;
    this.user_id = user_id;
    this.type = role;
    this.games = [];
  }

  new_game() {

  }

  static none = -1;
  static player = 1;
  static admin = 2;

}


exports.User = User;
