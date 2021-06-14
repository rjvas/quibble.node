/*
  This file breaks down into 2 sections: 1) the node server responding to
  http requests and the WebSocket server responding to update requests.
  The http server is on port 3042 and the WebSocket server on 3043.

  This file is also at the top of the control hierarchy. Game (js/game.js)
  manages the play. See in-line comments for more info.
*/

//
const db = require('./js/db');
let db_heist;
db.connect()
    .then(() => logger.info('database connected'))
    .then(() => startup())
    .catch((e) => {
        console.error(e);
        // maybe later
        // process.exit(1);
    });

const http = require('http');
const pug = require('pug');
var fs = require('fs');
var url = require('url');
var path = require('path');


// pug is a template engine that can pre-compile template defs
var pug_grid = pug.compileFile('views/grid.pug');
var pug_welcome = pug.compileFile('views/welcome.pug');
var pug_user = pug.compileFile('views/user.pug');
var pug_admin = pug.compileFile('views/admin.pug');

// import the Game and Word classes. Game is needed at this level to
// help with control and Word contributes data to the pug template.
var ActiveGame = require('./js/activegame').ActiveGame;
var Game = require('./js/game').Game;
var Word = require('./js/word').Word;
var User = require('./js/user').User;
var Admin = require('./js/admin_srv').Admin;
var logger = require('./js/log').logger;

const main_port = 3042;
// const sock_port = 3043;
// const hostname = 'www.drawbridgecreativegames.com';
const hostname = 'localhost';

var createServer_count = 0;

var CurrentAGame = null;

var mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "json": "application/json",
  "css": "text/css"
};

function get_user_agame(remote_addr, query) {
  var params = null;
  let user_id = null;
  let game_id = null;
  let game_idx = -1;
  let vs = null;

  if (query) {
    params = new URLSearchParams(query);
    user_id = params.get("user");
    game_id = params.get("game");
    game_idx = params.get("game_idx")
    vs = params.get("vs");
  }

  logger.debug("heist.get_user_agame remote_addr: " + remote_addr +
    " query: " + query);

  let user = null;
  user_id ? user = User.current_users.find(u => {
    return u.request_address == remote_addr &&
        u.id.toHexString() == user_id
  }) : user = User.current_users.find(u => {
    return u.request_address == remote_addr
  });

  let agame = null;
  if (user) {
    if (game_id)
      agame = ActiveGame.all_active.find(g => {
        return g.game_id_str == game_id ||
              g.name == game_id;
      });
    else
      agame = ActiveGame.all_active.find(g => {
        return g.user1 == user || g.user2 == user;
      });

    if (agame)
      logger.debug("heist.get_user_agame: user= " + user.display_name +
        " agame= " + agame.name);
    else
      logger.debug("heist.get_user_agame: user= " + user.display_name);

  }
  return {"user" : user, "agame" : agame, "game_idx" : game_idx, "vs" : vs};
}

function massage_user_lists(user) {
  // look at names of all_active and 'disable' those that are Also
  // in the users saved games list

  // first get the list to be submitted to pug
  let glist = user.get_saved_game_list();
  let ag = null;
  glist.forEach((item, i) => {
    if (ag = ActiveGame.all_active.find(ag => {return ag.name == item.name})) {
      item.active = false;
      if (!user.active_games.find(ag => {return ag.name == item.name})) {
        user.active_games.push(ag);
        // if an ag of this user is found in the ActiveGame.all_active list
        // AND this user is not u1 or u2, stuff it in the empy slot
        if (!ag.user1)
          ag.user1 = user;
        else if (!ag.user2)
          ag.user2 = user;
      }
    }
  });

  return glist;
}

function startup() {
  /*
  // pug is a template engine that can pre-compile template defs
  var pug_grid = pug.compileFile('views/grid.pug');
  var pug_welcome = pug.compileFile('views/welcome.pug')
  */

  logger.info("heist.startup: starting up Word Heist ...");

  // Create the http server and set up the callbacks
  var server = http.createServer((request, response) => {
    var pathname = url.parse(request.url).pathname;
    var query = url.parse(request.url).query;
    var remote_addr = request.client.remoteAddress;
    var filename = null;

    if (Admin && ActiveGame && !Admin.active_games)
      Admin.active_games = ActiveGame.all_active;

    if (pathname.indexOf("new_practice_game") != -1) {
      CurrentAGame == null;
      let user = get_user_agame(remote_addr, query).user;
      if (user) {
        CurrentAGame = new ActiveGame(user, user, ActiveGame.in_play|ActiveGame.practice);
        ActiveGame.all_active.push(CurrentAGame);
        user.active_games.push(CurrentAGame);
        pathname = "/player1";
        logger.info("NEW GAME!!");
        response.writeHead(302 , {
           'Location' : pathname + "?game=" + CurrentAGame.name +
            "&user=" + user.id.toHexString()
        });
        response.end();
      }

      logger.debug("heist.listen: <new_practice_game> port: " + CurrentAGame.port + " remote_addr: " +
        remote_addr + " user.request_addr");
    }

    else if (pathname.indexOf("save_game") != -1) {
      let ug = get_user_agame(remote_addr, query);
      CurrentGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        pathname.indexOf("player1") != -1 ? pathname = "/player1" :
          pathname = "/player2";
        CurrentAGame.save();
      }

      logger.debug("heist.listen: <save_game> port: " + CurrentAGame.port + " remote_addr: " +
        remote_addr + " user.request_addr: " + user.request_addr);
    }

    else if (pathname.indexOf("save_close_game") != -1) {
      let ug = get_user_agame(remote_addr, query);
      CurrentAGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        pathname.indexOf("player1") != -1 ? pathname = "/player1" :
          pathname = "/player2";
        CurrentAGame.save(true, pathname);
      }

      logger.debug("heist.listen: <save_close_game> port: " + CurrentAGame.port + " remote_addr: " +
        remote_addr + " user.request_addr: " + user.request_addr);
    }

    else if (pathname.indexOf("play_active_game") != -1) {
      let ug = get_user_agame(remote_addr, query);
      // query should hold the index to the selected game
      if (ug.user) {
        CurrentAGame = ug.user.active_games[ug.game_idx];

        logger.debug("heist.listen: <play_active_game> CurrentAGame.name: " +
          CurrentAGame.name + " query: " + query);

        // if the game is a practice game ug.user is *both* user1 and user2
        // so, set pathname with game.current_player
        if (CurrentAGame.status & ActiveGame.practice) {
          CurrentAGame.game.current_player == CurrentAGame.game.player_1 ?
            pathname = "/player1" : pathname = "/player2";
        } else {
          ug.user == CurrentAGame.user1 ? pathname = "/player1" :
            pathname = "/player2";
        }

        if (ActiveGame.all_active.indexOf(CurrentAGame) == -1)
          ActiveGame.all_active.push(CurrentAGame);

        response.writeHead(302 , {
           'Location' : pathname + "?game=" + CurrentAGame.game_id_str +
            "&user=" + ug.user.id.toHexString()
        });
        response.end();

        logger.debug("heist.listen: <play_active_game> port: " + CurrentAGame.port + " remote_addr: " +
          remote_addr + " user.request_addr: " + ug.user.request_addr);
        }
    }

    else if (pathname.indexOf("load_game") != -1) {
      let ugv = get_user_agame(remote_addr, query);
      let user = ugv.user;
      // query should hold the index to the selected game
      if (user)
        ActiveGame.new_active_game_json(user.saved_games[ugv.game_idx], user, response);

      logger.debug("heist.listen: <load_game> ActiveGame.all_active list idx: " + query);
    }

    else if (pathname.indexOf("delete_game") != -1) {
      let ugv = get_user_agame(remote_addr, query);
      let user = ugv.user;
      // query should hold the index to the selected game
      if  (user && user.saved_games[ugv.game_idx])
        ActiveGame.delete_game(user.saved_games[ugv.game_idx], response, user);

      logger.debug("heist.listen: <delete_game> user.saved_games list idx: " + query);
    }

    else if (pathname.indexOf("play_pickup_game") != -1) {
      let u2 = null;
      let u1 = null;
      let ugv = get_user_agame(remote_addr, query);

      if (u1 = ugv.user) {
        // this is the index of the chosen player in the pickup list
        let pickup_idx = ugv.vs;
        let pickup_name = User.pickup_gamers[pickup_idx];
        u2 = User.current_users.find(u => {
          return u.display_name == pickup_name;
        });
        // if we got u2 remove the pickup gamer from the list
        if (u2)
          User.pickup_gamers = User.pickup_gamers.filter(g => g != pickup_name);
      }

      if (u1 && u2) {
        CurrentAGame = new ActiveGame(u1, u2, ActiveGame.in_play);
        ActiveGame.all_active.push(CurrentAGame);
        u1.active_games.push(CurrentAGame);
        u2.active_games.push(CurrentAGame);
        pathname = "/player1";
        logger.info("NEW GAME!!");
        // response.end(CurrentAGame.game_id_str);
        response.end(pug_grid({
          'a_game_chat_text' : CurrentAGame.chat_text,
          'is_admin' : ugv.user.role & User.admin,
          'user_id' : ugv.user.id.toHexString(),
          'game_id' : CurrentAGame.game_id_str,
          'is_practice' : false,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));

        logger.debug("heist.listen: <new_pickup_game> " + CurrentAGame.name + " port: "
          + CurrentAGame.port + " remote_addr: " + remote_addr);
      }
      else {
        logger.error("heist.listen: <new_pickup_game> u1: ", u1, " u2: ", u2);
      }
    }

    else if (pathname.indexOf("add_pickup_name") != -1) {
      let user = get_user_agame(remote_addr, query).user;
      if (user && User.pickup_gamers.indexOf(user.display_name) == -1) {
        User.pickup_gamers.push(user.display_name);
        response.end(pug_user({
          'User' : User,
          'user': user,
          'games': user.get_saved_game_list(),
          'a_games' : user.get_a_game_list(),
          'gamers' : User.get_pickup_gamers()}));

        logger.debug("heist.listen: <add_pickup_name>" );
      }
    }

    else if (pathname == "/") {
      response.end(pug_welcome({"error" : query}));
      logger.debug("heist.listen: </> remote_addr: " + remote_addr);
    }

    // async
    else if (pathname == "/register") {
      User.register(query, response);
    }

    // async
    else if (pathname == "/login") {
      User.login(query, remote_addr, response);
      logger.debug("heist.listen: </login> remote_addr: " + remote_addr);
    }

    else if (pathname == "/logout") {
      let user = get_user_agame(remote_addr, query).user;
      // give the user a chance to clean up
      if (user) {
        let remove_ags = [];

        // filter all runtime lists for user
        User.pickup_gamers = User.pickup_gamers.filter(g => g != user.display_name);
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

        user.logout(response);

        logger.debug("heist.listen: </logout> remote_addr: " +
          remote_addr + " user.request_addr: " + user.request_addr);
      }
    }

    else if (pathname.indexOf("home_page") != -1) {
      let ug = get_user_agame(remote_addr, query);
      if (ug.user) {
        let glist = massage_user_lists(ug.user);
        response.end(pug_user({
          'User' : User,
          'user': ug.user,
          'games': glist,
          'a_games' : ug.user.get_a_game_list(),
          'gamers' : User.get_pickup_gamers()}));

        logger.debug("heist.listen: <home_page> remote_addr: " +
          remote_addr + " user.request_addr: " + ug.user.request_addr);
      }
    }

    else if (pathname.indexOf("wh_admin_user") != -1) {
      let ug = get_user_agame(remote_addr, query);
      if (ug.user) {
        response.end(JSON.stringify(ug.user.get_JSON()));

        logger.debug("heist.listen: <wh_admin_user> remote_addr: " +
          remote_addr + " user.request_addr: " + ug.user.request_addr);
      }
    }

    else if (pathname.indexOf("wh_admin") != -1) {
      let ug = get_user_agame(remote_addr, query);
      if (ug.user) {
        response.end(pug_admin({
          'admin' : ug.user.admin,
          'User' : User,
          'user': ug.user,
          'user_saved_games': ug.user.get_saved_game_list(),
          'user_a_games' : ug.user.get_a_game_list(),
          'all_active_games' : ActiveGame.all_active
        }));

        logger.debug("heist.listen: <wh_admin> remote_addr: " +
          remote_addr + " user.request_addr: " + ug.user.request_addr);
      }
    }

    // This will refresh the player's page with the currrent state of CurrentGame
    else if (pathname === "/player1" || pathname === "/player2") {
      logger.debug("heist.listen: <regular play> query: " + query);

      let ug = get_user_agame(remote_addr, query);
      let player = pathname;

      CurrentAGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        response.writeHead(200, {
          'Content-Type': 'text/html'
        });
        let is_practice = CurrentAGame.status & ActiveGame.practice;

        // this block is called for regular games an practice games. If it's a
        // regular game the 'player' is set by the pathname. Otherwise, the
        // player needs to be set to the CurrentAGame's active player.
        if (is_practice) {
          CurrentAGame.game.current_player == CurrentAGame.game.player_1 ?
            player = "/player1" : player = "/player2";
        }

        logger.info("pathname: " + pathname + " filename: " + filename);
        response.end(pug_grid({
          'a_game_chat_text' : CurrentAGame.chat_text,
          'is_admin' : user.role & User.admin,
          'user_id' : user.id.toHexString(),
          'game_id' : CurrentAGame.game_id_str,
          'is_practice' : is_practice,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : player}));

        logger.debug("heist.listen: <regular play> /player: " + user.display_name + " userport: " + CurrentAGame.port + " remote_addr: " +
          remote_addr + " user.request_addr: " + user.request_addr);
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
        logger.error('heist.listen: File does not exist: ' + filename);
        response.writeHead(404, {
          'Content-Type': 'text/plain'
        });
        response.write('404 Not Found\n');
        response.end();
        return;
      }
      logger.debug("heist.listen <files> pathname: " + pathname + " filename: " + filename)
      return;
    }
  });
  server.listen(main_port);
}
