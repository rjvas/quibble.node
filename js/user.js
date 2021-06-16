/*
The class that represents a user of the system - currently player and strator
*/

const bcrypt = require('bcrypt');
const salt_rounds = 10;
const db = require('./db');
var logger = require('./log').logger;
var Admin = require('./admin_srv').Admin

class User {
  constructor(sonj) {
    this.id = sonj._id;
    this.active = sonj.active;
    this.deactivate_reason = sonj.deactivate_reason;
    this.description = sonj.description;
    this.failed_login_count = sonj.failed_login_count;
    this.last_lockout_date = sonj.last_lockout_date;
    this.last_login_date = sonj.last_login_date;
    this.user_name = sonj.user_name;
    this.display_name = sonj.display_name;
    this.email = sonj.email;
    this.password = sonj.password;
    // this.roles = [].push(new UserRole(this.id, UserRole.player));
    this.role = sonj.role;
    this.status = sonj.status;
    this.saved_games = [];
    this.active_games = [];
    this.friends = sonj.friends;
    this.request_address = sonj.request_address;
    this.admin = null;
  }

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
      "friends" : this.friends,
      "request_address" : this.request_address
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

  get_saved_game_list() {
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

  get_user_page() {
    let games = this.getGameList();
    let gamers = User.get_pickup_gamers();
    let invite = true;
    return pug_user({
      'games' : games,
      'gamers' : gamers
    });
  }

  static get_pickup_gamers() {
     return User.pickup_gamers;
  }

  static login (query, request_addr, response) {

    var new_user = null;
    var params = new URLSearchParams(query);
    let name = params.get("username");
    let passw = params.get("password");

    let logged_in = User.current_users.find(u => {
      return u.user_name == name;
    });
    if (logged_in) {
      logger.error("User.login error - " + name + " is already logged in");
      response.writeHead(302 , {
         'Location' : '/?error_login'
      });
      response.end();
      return;
    }

    let id;
    let dbq = { "user_name": name };
    let usr = db.get_db().collection('users').findOne(dbq)
      .then((usr) => {
        if (usr) {
          if (bcrypt.compareSync(passw, usr.password)) {
            new_user = new User(usr);
            new_user.last_login_date = Date();
            new_user.request_address = request_addr;
            User.current_users.push(new_user);
            if (new_user.role & User.admin) {
              // give Admin a reference to all the active users
              new_user.admin = new Admin(new_user, User.current_users);
            }
            id = usr._id;
          } else {
            logger.error("login error - " + name + "wrong password");
            response.writeHead(302 , {
               'Location' : '/?error_password'
            });
            response.end();
          }
        }
        else {
          logger.error("login error - no user with: " + name + "/" + passw);
          response.writeHead(302 , {
             'Location' : '/?error_password'
          });
          response.end();
        }
        dbq = { $or: [ { "user1_id": id }, { "user2_id": id } ] };
        return db.get_db().collection('active_games').find(dbq);

      }).then(result => {
        return result.toArray();

      }).then(result => {
        if (new_user) {
          new_user.saved_games = result;
          response.writeHead(302 , {
             'Location' : '/home_page?user=' + new_user.id.toHexString()
          });
          response.end();
        }
      })

      .catch((e) => console.error(e));
  }

  static register(query, response) {
    var params = new URLSearchParams(query);
    let user_name = params.get("username");
    let display_name = params.get("displayname")
    let passw = params.get("password");
    let email = params.get("email")

    let salt = bcrypt.genSaltSync(salt_rounds);
    let pw_hashed = bcrypt.hashSync(passw, salt);

    const q = { user_name: user_name };
    const update =
      { $set:  { "user_name": user_name, "display_name" : display_name, "password" : pw_hashed, "email" : email }};
    const options = { upsert: true };
    db.get_db().collection('users').updateOne(q, update, options)
      .then(res => {
        response.writeHead(302 , {
           'Location' : '/'
        });
        response.end();
      })
      .catch((e) => {
        console.error(e);
      });
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
