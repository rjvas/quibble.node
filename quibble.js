/*
  Copyright 2021 Richard Vassilaros

  This file breaks down into 2 sections: 1) the node server responding to
  http requests and the WebSocket server responding to update requests.
  The http server is on port 80.

  This file is also at the top of the control hierarchy. Game (js/game.js)
  manages the play. See in-line comments for more info.
*/

//const https = require('https');
const http = require('http');
var fs = require('fs');
// const concat = require('concat-stream');

// debug or release, etc
const quib_cfg = require('./js/quib_config.json');

const main_port = 80;
// const main_port = 443;
var hostname = (quib_cfg.local ? 'localhost' : 'letsquibble.net');

//const certdir = (fs.readdir("/etc/letsencrypt/live"))[0];
// const options = {
  // key: fs.readFileSync("./privkey.pem"),
  // cert: fs.readFileSync("./fullchain.pem")
// };

// const {key, cert} = await (async () => {
// 	const certdir = (await fs.readdir("/etc/letsencrypt/live"))[0];

// 	return {
// 		key: await fs.readFile(`/etc/letsencrypt/live/${certdir}/privkey.pem`),
// 		cert: await fs.readFile(`/etc/letsencrypt/live/${certdir}/fullchain.pem`)
// 	}
// })();

const db = require('./js/db');
db.connect()
    .then(() => logger.info('database connected'))
    .then(() => 
      startup())
    .catch((e) => {
        console.error(e);
        // maybe later
        // process.exit(1);
    });

// const jwt = require('jsonwebtoken');
const pug = require('pug');
var url = require('url');
var path = require('path');


// pug is a template engine that can pre-compile template defskkkkk
var pug_grid = pug.compileFile('views/grid.pug');
var pug_welcome = pug.compileFile('views/welcome.pug');
var pug_reset = pug.compileFile('views/reset.pug');
var pug_user = pug.compileFile('views/user.pug');
var pug_admin = pug.compileFile('views/admin.pug');

// import the Game and Word classes. Game is needed at this level to
// help with control and Word contributes data to the pug template.
var System  = require('./js/system').System;
var ActiveGame = require('./js/activegame').ActiveGame;
var Game = require('./js/game').Game;
var Word = require('./js/word').Word;
var User = require('./js/user').User;
var Admin = require('./js/admin_srv').Admin;
var logger = require('./js/log').logger;
var WtDebug = require('./js/log').WT_DEBUG;

var CurrentAGame = null;
var Sys = null;

var mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "json": "application/json",
  "css": "text/css"
};

function get_user_agame(query) {
  var params = null;
  let user_id = null;
  let game_id = null;
  let game_name = null;
  let vs = null;

  if (query) {
    params = new URLSearchParams(query);
    user_id = params.get("n");
    game_id = params.get("a");
    game_name = params.get("game_name");
    vs = params.get("vs");
  }

  if (quib_cfg.debug)
    logger.debug("quibble.get_user_agame : " + " query: " + query);

  let user = null;
  user_id ? user = User.current_users.find(u => {
    return  u.id.toHexString() == user_id 
  }) : user = null;

  let agame = null;
  if (user) {
    if (game_id)
      agame = ActiveGame.all_active.find(g => {
        return g.game_id_str == game_id ||
              g.name == game_id;
      });
    else if (game_name) {
      agame = ActiveGame.all_active.find(g => {
        return g.name == game_name;
      });
    }
    else
      agame = ActiveGame.all_active.find(g => {
        return g.user1 == user || g.user2 == user;
      });

    if (quib_cfg.debug) {
      if (agame)
        logger.debug("quibble.get_user_agame: user= " + user.display_name +
          " agame= " + agame.name);
      else
        logger.debug("quibble.get_user_agame: user= " + user.display_name);
    }

  }
  return {"user" : user, "agame" : agame, "game_name" : game_name, "vs" : vs};
}



function play_active_game(query, response) {
  let ret_val = true;
  let ug = get_user_agame(query);
  // query should hold the index to the selected game
  if (ug.user) {
    CurrentAGame = ug.agame;
    if (CurrentAGame) {
      // first, make sure both users are represented in the active game (if
      // one user logs in and opens the game before the other user is logged in
      // one of the AG users will be 'undefined')
      if (!CurrentAGame.user1 && CurrentAGame.tmp_user_id == ug.user.id.toHexString())
        CurrentAGame.user1 = ug.user;
      else if (!CurrentAGame.user2 && CurrentAGame.tmp_user_id == ug.user.id.toHexString())
        CurrentAGame.user2 = ug.user;

      if (!ActiveGame.all_active.find(ag => {return ag.name == CurrentAGame.name}))
        ActiveGame.all_active.push(CurrentAGame);

      response.writeHead(302 , {
          'Location' : "/play?a=" + CurrentAGame.game_id_str + "&n=" + ug.user.id.toHexString()
      });
      response.end();

    if (quib_cfg.debug) 
      logger.debug(`quibble.play_active_game user=${ug.user.display_name}/${ug.user.id.toHexString()} 
        game=${CurrentAGame.game.name_time} port: ${CurrentAGame.port}`); 
    }
    else ret_val = false;
  }

  return ret_val;
}

function startup() {
  /*
  // pug is a template engine that can pre-compile template defs
  var pug_grid = pug.compileFile('views/grid.pug');
  var pug_welcome = pug.compileFile('views/welcome.pug')
  */

  System.get_system();

  if (quib_cfg.debug) 
    logger.info("quibble.startup: starting up Quibble ...");

  // Create the http server and set up the callbacks
  var server = http.createServer((request, response) => {
    var pathname = url.parse(request.url).pathname;
    var query = url.parse(request.url).query;
    var remote_addr = request.client.remoteAddress;
    var user_agent = request.headers["user-agent"];
    // request.on is async resulting in 'undefined' values
    // for body and json_body. fuck.
    // var body = "";
    // var json_body;
    // if (user_agent == "quibbleReact") {
    //   request.on('data', function (data) {
    //     body += data;
    //   });
    //   request.on('end', function () {
    //     if (body)
    //       json_body = JSON.parse(body);
    //   });
    // }
    var filename = null;

    if (Admin && ActiveGame && !Admin.active_games)
      Admin.active_games = ActiveGame.all_active;

    if (pathname.indexOf("new_practice_game") != -1) {
      CurrentAGame == null;
      let user = get_user_agame(query).user;
      if (user) {
        CurrentAGame = new ActiveGame(server, user, user, ActiveGame.in_play|ActiveGame.practice);
        ActiveGame.all_active.push(CurrentAGame);
        user.active_games.push(CurrentAGame);
        CurrentAGame.save(false, null);
        response.writeHead(302 , {
           'Location' : "/play?a=" + CurrentAGame.name + "&n=" + user.id.toHexString()
        });
        response.end();
      }

        if (CurrentAGame && quib_cfg.debug)
          logger.debug(`quibble.new_practice_game user=${user.display_name}/${user.id.toHexString()} 
            game=${CurrentAGame.game.name_time} port: ${CurrentAGame.port}`); 
    }

    else if (pathname.indexOf("save_game") != -1) {
      let ug = get_user_agame(query);
      CurrentAGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        CurrentAGame.save();
        if (quib_cfg.debug) 
          logger.debug(`quibble.save_game user=${user.display_name}/${user.id.toHexString()} 
            game=${CurrentAGame.game.name_time} port: ${CurrentAGame.port}`); 
      }
    }

    else if (pathname.indexOf("save_close_game") != -1) {
      let ug = get_user_agame(query);
      CurrentAGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        CurrentAGame.save();
        if (quib_cfg.debug) 
          logger.debug(`quibble.save_close_game user=${user.display_name}/${user.id.toHexString()} 
            game=${CurrentAGame.game.name_time} port: ${CurrentAGame.port}`); 
      }
    }

    else if (pathname.indexOf("play_active_game") != -1) {
      play_active_game(query, response);
    }

    else if (pathname.indexOf("load_game") != -1) {
      if (!play_active_game(query, response)) {
        let ugv = get_user_agame(query);
        let user = ugv.user;
        // query should hold the index to the selected game
        if (user) {
          ActiveGame.new_active_game_json(server, user.get_game(ugv.game_name), user, response);

          if (quib_cfg.debug) 
            logger.debug(`quibble.load_game user=${user.display_name}/${user.id.toHexString()} 
              game=${user.get_game(ugv.game_name)}'); // not yet initialized(async) port: ${user.get_game(ugv.game_name).port}`); 
        }
      }
    }

    else if (pathname.indexOf("delete_game") != -1) {
      let ugv = get_user_agame(query);
      let user = ugv.user;
      // query should hold the index to the selected game
      if  (user && user.get_game(ugv.game_name)) {
        ActiveGame.delete_game(user.get_game(ugv.game_name), response, user);

        if (quib_cfg.debug) 
          logger.debug(`quibble.delete_game user=${user.display_name}/${user.id.toHexString()} 
            game=${ugv.game_name}`); 
      }
    }

    else if (pathname.indexOf("edit_invitations") != -1) {
      if (!Sys) Sys = System.get_system();
      let user = get_user_agame(query).user;
      var params = new URLSearchParams(query);
      // colon separated list of ids
      let iids = params.get("iids");
      let uid_hex = params.get("n")

      Sys.remove_invitations(iids);
      let invites = Sys.get_users_invitations(uid_hex);

      response.end(pug_user({
        'User' : User,
        'user': user,
        'games': user.get_saved_game_list(ActiveGame.game_over),
        'gamers' : User.get_pickup_gamers(),
        'invites' : invites,
        'friends' : user.friends,
        'players' : User.players,
        'is_local': quib_cfg.local ? "true" : "false",
        'is_debug' : quib_cfg.debug ? "true" : "false"
      }));
    }

    else if (pathname.indexOf("invite_friend") != -1) {
      if (!Sys) Sys = System.get_system();
      let user = get_user_agame(query).user;

      user.invite_friend(query);

      let invites = Sys.get_users_invitations(user.id.toHexString());
      response.end(pug_user({
        'User' : User,
        'user': user,
        'games': user.get_saved_game_list(ActiveGame.game_over),
        'gamers' : User.get_pickup_gamers(),
        'invites' : invites,
        'friends' : user.friends,
        'players' : User.players,
        'is_local' : quib_cfg.local ? "true" : "false",
        'is_debug' : quib_cfg.debug ? "true" : "false",
      }));
    }

    else if (pathname.indexOf("invitation_accept") != -1) {
      if (!Sys) Sys = System.get_system();
      var params = new URLSearchParams(query);
      let iid = params.get("iid");

      let invite = Sys.get_invitation(parseInt(iid));
      if (!invite)
        response.end(pug_welcome({"error" : "error_bad_invitation_id", "invitation_id" : iid}));
      else
        response.end(pug_welcome({"error" : "invitation_accepted", "invitation_id" : iid}));

      if (quib_cfg.debug) 
        logger.debug(`quibble.invitation - query=${query}`); 
        // user=${user.display_name}/${user.id.toHexString()} 
        // game=${ugv.game_name}`); 
    }

    else if (pathname.indexOf("play_pickup_game") != -1) {
      let u2 = null;
      let u1 = null;
      let ugv = get_user_agame(query);

      if (u1 = ugv.user) {
        // this is the index of the chosen player in the pickup list
        let pickup_name = ugv.vs;
        u2 = User.current_users.find(u => {
          return u.display_name == pickup_name;
        });
        // if we got u2 remove the pickup gamer from the list
        if (u2)
          User.remove_pickup_gamer(pickup_name, u1.display_name);
      }

      if (u1 && u2) {
        CurrentAGame = new ActiveGame(server, u1, u2, ActiveGame.in_play);
        ActiveGame.all_active.push(CurrentAGame);
        u1.active_games_add(CurrentAGame);
        u2.active_games_add(CurrentAGame);
        ActiveGame.send_msg_to_user(u2, `Player ${u1.display_name} has accepted your challenge!`);
        CurrentAGame.save(false, null);
        response.end(`/play?n=${ugv.user.id.toHexString()}&game_name=${CurrentAGame.game_id_str}`);

        if (quib_cfg.debug) 
          logger.debug(`quibble.new_pickup_game user=${u1.display_name}/${u2.display_name} game=${CurrentAGame.game.name_time} port: ${CurrentAGame.port}`); 
      }
      else if (quib_cfg.debug) 
        logger.error("quibble.new_pickup_game u1: ", u1, " u2: ", u2);
    }

    else if (pathname.indexOf("add_pickup_name") != -1) {
      if (!Sys) Sys = System.get_system();
      let user = get_user_agame(query).user;
      if (user && User.pickup_gamers.indexOf(user.display_name) == -1) {
        User.add_pickup_gamer(user.display_name);
        let invites = Sys.get_users_invitations((user.id.toHexString()));
        response.end(pug_user({
          'User' : User,
          'user': user,
          'games': user.get_saved_game_list(ActiveGame.game_over),
          'gamers' : User.get_pickup_gamers(),
          'invites' : invites,
          'is_local' : quib_cfg.local ? "true" : "false",
          'is_debug' : quib_cfg.debug ? "true" : "false" }));

        if (quib_cfg.debug) 
          logger.debug(`quibble.add_pickup_name user=${user.display_name}/${user.id.toHexString()}`); 
      }
    }

    // site root
    else if (pathname == "/") {
      if (!Sys) Sys = System.get_system();
      var params = new URLSearchParams(query);
      let error = params.get("err");
      let iid = params.get("iid");
 
      if (iid) {
        let invite = Sys.get_invitation(parseInt(iid));
        if (!invite)
          response.end(pug_welcome({"error" : "error_bad_invitation_id", "invitation_id" : iid}));
        else
          response.end(pug_welcome({"error" : error, "invitation_id" : iid}));
      }
      else
        response.end(pug_welcome({"error" : error, "invitation_id" : iid}));

      if (quib_cfg.debug)
        logger.debug("quibble.login query: " + query);
    }

    else if (pathname == "/reset_phase1") {
      var params = new URLSearchParams(query);
      let name = params.get("username");
      let email = params.get("email");
      let err = params.get("err");
      let tmpl = null;

      if (err) {
        tmpl = pug_reset({"phase1" : true, "phase2" : false, "error" : err});
        response.end(tmpl);
      }
      else if (!name || !email) {
        err = "error_no_username_email";
        tmpl = pug_reset({"phase1" : true, "phase2" : false, "error" : err});
        response.end(tmpl);
      }
      else {
        User.reset_phase1(query, response);
      }
    }

    else if (pathname == "/reset_phase2") {
      var params = new URLSearchParams(query);
      let hp = decodeURIComponent(params.get("hp"));
      let err = decodeURIComponent(params.get("err"));

      let tmpl = pug_reset({"phase1" : false, "phase2" : true, "error" : err});
      User.reset_phase2(hp, tmpl, response);
    }

    else if (pathname == "/reset_phase3") {
      var params = new URLSearchParams(query);
      let hp = params.get("hp");
      let err = decodeURIComponent(params.get("err"));
      let pass1 = params.get("password");
      let pass2 = params.get("password2");
      let tmpl = null;
      
      if (!hp || hp == '') { 
        var ref = request.headers["referer"];
        var ref_params = ref.split("=");
        hp = decodeURIComponent(ref_params[1]);
      }

      if (err && err != 'null') {
        tmpl = pug_reset({"phase1" : false, "phase2" : true, "hp" : hp, "error" : err});
        response.end(tmpl);
      }
      else if (!pass1 || !pass2) {
        tmpl = pug_reset({"phase1" : false, "phase2" : true, "hp" : hp, "error" : "error_no_pass"});
        response.end(tmpl);
      }
      // passwords don't match - error and try again
      else if (pass1 != pass2) {
        tmpl = pug_reset({"phase1" : false, "phase2" : true, "hp" : hp, "error" : "error_pass_no_match"});
        response.end(tmpl);
      }
      else
        User.reset_phase3(query, hp, response);
    }

    else if (pathname == "/forgot") {
      response.end(pug_reset({"phase1" : true, "phase2" : false}));
    }

    else if (pathname == "/register") {
      User.register(query, response);
      if (quib_cfg.debug)
        logger.debug("quibble.register query: " + query);
    }

    else if (pathname == "/login") {
      if (!Sys) Sys = System.get_system();
      User.login(server, query, remote_addr, user_agent, response, ActiveGame);
      if (quib_cfg.debug)
        logger.debug("quibble.login query: " + query);
    }

    // RJV NOTE much of this should be relocated to User.logout
    else if (pathname == "/logout") {
      let user = get_user_agame(query).user;
      // give the user a chance to clean up
      if (user) {
        let remove_ags = [];

        // filter all runtime lists for user
        // per Asana "Names dropping from player queue"
        // User.pickup_gamers = User.pickup_gamers.filter(g => g != user.display_name);
        User.current_users = User.current_users.filter(u => !u.id.equals(user.id));

        // check all active games - if both users are logged out, remove from all_active
        let user_games = ActiveGame.all_active.filter(ag => {
          return ag.user1 == user || ag.user2 == user;
        });

        let u2 = null;
        let u1 = null;
        user_games.forEach((item, i) => {
          if (item.user1 == user) {
            // This user is user1 so try to find user2 in the
            // current_users list. If not there, can remove ag.
            if (!(u2 = User.current_users.find(u => {
              return u == item.user2
            }))) {
              item.status |= ActiveGame.remove_active;
              remove_ags.push(item);
            }
          }
          else if (item.user2 == user) {
            // This user is user2 so try to find user1 in the
            // current_users list. If not there, can remove ag.
            if (!(u1 = User.current_users.find(u => {
              return u == item.user1
            }))) {
              item.status |= ActiveGame.remove_active;
              remove_ags.push(item);
            }
          }
        });

        remove_ags.forEach((item, i) => {
          if (item.status & ActiveGame.remove_active) {
            // clear the bit
            item.status ^= ActiveGame.remove_active;
            ActiveGame.all_active = ActiveGame.all_active.filter(ag => ag != item);
          }
        });

        if (quib_cfg.debug)
          logger.debug(`quibble.logout user=${user.display_name}/${user.id.toHexString()}`); 
 
        user.logout(response);

      }
    }

    else if (pathname.indexOf("home_page") != -1) {
      if (!Sys) Sys = System.get_system();
      let ug = get_user_agame(query);
      if (ug.user) {
        let glist = ug.user.get_saved_game_list(ActiveGame.game_over);
        let invites = Sys.get_users_invitations(ug.user.id.toHexString());
        response.end(pug_user({
          'User' : User,
          'user': ug.user,
          'games': glist,
          'gamers' : User.get_pickup_gamers(),
          'invites' : invites,
          'friends' : ug.user.friends,
          'players' : User.players,
          'is_local' : quib_cfg.local ? "true" : "false",
          'is_debug' : quib_cfg.debug ? "true" : "false"}));
          
        if (quib_cfg.debug)
          logger.debug(`quibble.home_page user=${ug.user.display_name}/${ug.user.id.toHexString()}`); 
      }
    }

    else if (pathname.indexOf("wh_admin_user") != -1) {
      let ug = get_user_agame(query);
      if (ug.user) {
        response.end(JSON.stringify(ug.user.get_JSON()));

        if (quib_cfg.debug)
          logger.debug(`quibble.wh_admin_user user=${ug.user.display_name}/${ug.user.id.toHexString()}`);
      }
    }

    else if (pathname.indexOf("wh_admin") != -1) {
      let ug = get_user_agame(query);
      if (ug.user) {
        response.end(pug_admin({
          'admin' : ug.user.admin,
          'User' : User,
          'user': ug.user,
          'user_saved_games': ug.user.get_saved_game_list(ActiveGame.game_over),
          'user_a_games' : ug.user.get_a_game_list(),
          'all_active_games' : ActiveGame.all_active,
          'is_local' : quib_cfg.local ? "true" : "false",
          'is_debug' : quib_cfg.debug ? "true" : "false"
        }));

        if (quib_cfg.debug)
          logger.debug(`quibble.wh_admin user=${ug.user.display_name}/${ug.user.id.toHexString()}`);
      }
    }

    // This will refresh the player's page with the currrent state of CurrentAGame
    else if (pathname === "/play") {
      let ug = get_user_agame(query);

      CurrentAGame = ug.agame;
      let user = ug.user;
      let player1_id = CurrentAGame.user1 ? CurrentAGame.user1.id.toHexString() : "";
      let player2_id = CurrentAGame.user2 ? CurrentAGame.user2.id.toHexString() : "";

      if (CurrentAGame) {
        response.writeHead(200, {
          'Content-Type': 'text/html'
        });

        let cur_player = CurrentAGame.game.current_player == CurrentAGame.game.player_1 ? 
          player1_id : player2_id;
        let is_practice = CurrentAGame.status & ActiveGame.practice ? "true" : "false";
        
        response.end(pug_grid({
          'CurrentAGame' : CurrentAGame,
          'is_admin' : user.role & User.admin ? "true" : "false",
          'user_id' : user.id.toHexString(),
          'player1_id' : player1_id,
          'player2_id' : player2_id,
          'current_player' : cur_player,
          'is_practice' : is_practice,
          'Game' : Game,
          'Word' : Word,
          'is_local' : quib_cfg.local ? "true" : "false",
          'is_debug' : quib_cfg.debug ? "true" : "false" }));

        if (quib_cfg.debug)
          logger.debug(`quibble.regular_play user=${user.display_name}/${user.id.toHexString()} 
            game=${CurrentAGame.game.name_time} port: ${CurrentAGame.port}`); 
      }
    }

    // error handling
    else {
      // DEBUG: Chrome sends a lot of these while debugging ...
      if (pathname == "/json" || pathname == "/json/version") return;

      filename = path.join(process.cwd(), pathname);
      try {
        fs.accessSync(filename, fs.F_OK);
        var fileStream = fs.createReadStream(filename);
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        response.writeHead(200, {
          'Content-Type': mimeType
        });
        fileStream.pipe(response);
      } catch (e) {
        if (quib_cfg.debug)
          logger.error('quibble.error: File does not exist: ' + filename);
        response.writeHead(404, {
          'Content-Type': 'text/plain'
        });
        response.write('404 Not Found\n');
        response.end();
        return;
      }
      if (quib_cfg.debug)
        logger.debug("quibble.support_files pathname: " + pathname + " filename: " + filename)
      return;
    }
  });
  server.listen(main_port);
 }

