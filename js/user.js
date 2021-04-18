/*
The class that represents a user of the system - currently player and strator
*/

const pug = require('pug');
const bcrypt = require('bcrypt');
const salt_rounds = 10;
const db = require('./db');

var pug_user = pug.compileFile('views/user.pug')

class User {
  constructor(sonj) {
    this.id = sonj._id;
    this.active = true;
    this.deactivate_reason = null;
    this.description = null;
    this.failed_login_count = 0;
    this.last_lockout_date = null;
    this.last_login_date = null;
    this.user_name = sonj.user_name;
    this.display_name = sonj.display_name;
    this.password = sonj.password;
    // this.roles = [].push(new UserRole(this.id, UserRole.player));
    this.role = UserRole.player;
    this.status = User.none;
    this.saved_games = [];
    this.active_games = [];
    this.friends = [];
    this.request_address = null;
  }

  get_game_list() {
    return ["game1", "game2", "game3"];
  }

  get_user_page() {
    let games = this.getGameList();
    let gamers = User.get_available_gamers();
    let invite = true;
    return pug_user({
      'games' : games,
      'gamers' : gamers
    });
  }

  static current_users = [];

  static none = -1;
  static looking4game = 1;
  static in_play = 2;

  static   get_available_gamers() {
     return ["bob", "alice"];
  }

  static login (query, request_addr, response) {

    var new_user = null;
    var params = new URLSearchParams(query);
    let name = params.get("username");
    let passw = params.get("password");

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
            id = usr._id;
            response.end(pug_user({
              'user': new_user,
              'games': new_user.get_game_list(),
              'gamers' : User.get_available_gamers()}));
          } else {
            console.log("login error - wrong password");
          }
        }
        else {
          console.log("login error - no user with: " + name + "/" + passw);
        }
      })
      .catch((e) => console.error(e));
  }

  static register(query) {
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
