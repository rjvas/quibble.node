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
    .then(() => console.log('database connected'))
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

// import the Game and Word classes. Game is needed at this level to
// help with control and Word contributes data to the pug template.
var ActiveGame = require('./js/activegame').ActiveGame;
var Game = require('./js/game').Game;
var Word = require('./js/word').Word;
var User = require('./js/user').User;

const main_port = 3042;
// const sock_port = 3043;
//const hostname = 'www.drawbridgecreativegames.com';
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

function get_user_agame(remote_addr, id) {

  let user = User.current_users.find(u => {
    return u.request_address == remote_addr;
  });

  let agame = null;
  if (user) {
    if (id)
      agame = ActiveGame.all_active.find(g => {
        return g.game_id_str == id;
      });
    else
      agame = ActiveGame.all_active.find(g => {
        return g.user1 == user || g.user2 == user;
      });
  }
  return {"user" : user, "agame" : agame};
}


function startup() {
  /*
  // pug is a template engine that can pre-compile template defs
  var pug_grid = pug.compileFile('views/grid.pug');
  var pug_welcome = pug.compileFile('views/welcome.pug')
  */

  // Create the http server and set up the callbacks
  var server = http.createServer((request, response) => {
    var pathname = url.parse(request.url).pathname;
    var query = url.parse(request.url).query;
    var remote_addr = request.client.remoteAddress;
    var filename = null;

    // Start a new game when the 'New' button is pressed and use the
    // precompiled template to show the inital page.
    // new Game() builds the entire runtime structure for a single game
    // either on startup (CurrentGame == null) or upon request and uses
    // that runtime structure to populate the compiled template, pug_grid.
    // That template is then returned to the requesting page through
    // respones.end(pug_grid(...)).
    if (pathname.indexOf("new_practice_game") != -1) {
      CurrentAGame == null;
      let user = get_user_agame(remote_addr, query).user;
      if (user) {
        CurrentAGame = new ActiveGame(user, user, ActiveGame.in_play|ActiveGame.practice);
        ActiveGame.all_active.push(CurrentAGame);
        user.active_games.push(CurrentAGame);
        pathname = "/player1";
        console.log("NEW GAME!!");
        response.end(pug_grid({
          'game_id' : CurrentAGame.game_id_str,
          'is_practice' : true,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));
      }

      console.log("<new_practice_game> port: " + CurrentAGame.port + " remote_addr: " +
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

      console.log("<save_game> port: " + CurrentAGame.port + " remote_addr: " +
        remote_addr + " user.request_addr: " + user.request_addr);
    }

    else if (pathname.indexOf("save_close_game") != -1) {
      let ug = get_user_agame(remote_addr, query);
      CurrentAGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        pathname.indexOf("player1") != -1 ? pathname = "/player1" :
          pathname = "/player2";
        CurrentAGame.save(true);
      }

      console.log("<save_close_game> port: " + CurrentAGame.port + " remote_addr: " +
        remote_addr + " user.request_addr: " + user.request_addr);
    }

    else if (pathname.indexOf("play_active_game") != -1) {
      let ug = get_user_agame(remote_addr);
      // query should hold the index to the selected game
      if (ug.user) {
        CurrentAGame = ug.user.active_games[parseInt(query)];

        // if the game is a practice game ug.user is *both* user1 and user2
        // so, set pathname with game.current_player
        if (CurrentAGame.status & ActiveGame.practice) {
          CurrentAGame.game.current_player == CurrentAGame.game.player1 ?
            pathname = "/player1" : pathname = "/player2";
        } else {
          ug.user == CurrentAGame.user1 ? pathname = "/player1" :
            pathname = "/player2";
        }

        if (ActiveGame.all_active.indexOf(CurrentAGame) == -1)
          ActiveGame.all_active.push(CurrentAGame);

        response.end(pug_grid({
          'game_id' : CurrentAGame.game_id_str,
          'is_practice' : CurrentAGame.status & ActiveGame.practice,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));
        }
    }

    else if (pathname.indexOf("load_game") != -1) {
      let user = get_user_agame(remote_addr).user;
      // query should hold the index to the selected game
      if (user)
        ActiveGame.new_active_game_json(user.saved_games[parseInt(query)], response);
    }

    else if (pathname.indexOf("delete_game") != -1) {
      let user = get_user_agame(remote_addr).user;
      // query should hold the index to the selected game
      if  (user)
        ActiveGame.delete_game(user.saved_games[parseInt(query)], response, user);
    }

    else if (pathname.indexOf("play_pickup_game") != -1) {
      let u2 = null;
      let u1 = get_user_agame(remote_addr).user;
      if (u1) {
        u2 = User.current_users.find(u => {
          return u.display_name == User.pickup_gamers[query];
        });
      }
      if (u1 && u2) {
        CurrentAGame = new ActiveGame(u1, u2, ActiveGame.in_play);
        ActiveGame.all_active.push(CurrentAGame);
        u1.active_games.push(CurrentAGame);
        u2.active_games.push(CurrentAGame);
        pathname = "/player1";
        console.log("NEW GAME!!");
        response.end(pug_grid({
          'game_id' : CurrentAGame.game_id_str,
          'is_practice' : false,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));
      }

      console.log("<new_pickup_game> port: " + CurrentAGame.port + " remote_addr: " +
        remote_addr + " user.request_addr");
    }

    else if (pathname.indexOf("pickup_game") != -1) {
      let user = get_user_agame(remote_addr).user;
      if (user && User.pickup_gamers.indexOf(user.display_name) == -1) {
        User.pickup_gamers.push(user.display_name);
        response.end(pug_user({
          'user': user,
          'games': user.get_game_list(),
          'a_games' : user.get_a_game_list(),
          'gamers' : User.get_pickup_gamers()}));
      }
    }

    else if (pathname == "/") {
      response.end(pug_welcome());
    }

    // async
    else if (pathname == "/register") {
      User.register(query, response);
    }

    // async
    else if (pathname == "/login") {
      User.login(query, remote_addr, response);
    }

    else if (pathname == "/logout") {
      let user = get_user_agame(remote_addr, query).user;
      // give the user a chance to clean up
      if (user) {
        user.logout(response);
      }
    }

    else if (pathname.indexOf("home_page") != -1) {
      let ug = get_user_agame(remote_addr, query);
      if (ug.user) {
        // remove game from current_game lists
        if (ug.agame) {
          ActiveGame.all_active = ActiveGame.all_active.filter(ag => ag.game_id_str != query);
        }

        response.end(pug_user({
          'user': ug.user,
          'games': ug.user.get_game_list(),
          'a_games' : ug.user.get_a_game_list(),
          'gamers' : User.get_pickup_gamers()}));
      }
    }

    // This will refresh the player's page with the currrent state of CurrentGame
    else if (pathname === "/player1" || pathname === "/player2") {
      let ug = get_user_agame(remote_addr, query);

      CurrentAGame = ug.agame;
      let user = ug.user;

      if (CurrentAGame) {
        response.writeHead(200, {
          'Content-Type': 'text/html'
        });
        console.log("pathname: " + pathname + " filename: " + filename);
        response.end(pug_grid({
          'game_id' : CurrentAGame.game_id_str,
          'is_practice' : CurrentAGame.status & ActiveGame.practice,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));

        console.log("</player> " + user.display_name + " userport: " + CurrentAGame.port + " remote_addr: " +
          remote_addr + " user.request_addr: " + user.request_addr);
      }
    }

    // error handling
    else {
      // DEBUG: Chrome sends a lot of these while debugging ...
      if (pathname == "/json" || pathname == "/json/version") return;

      filename = path.join(process.cwd(), pathname);
      // console.log("pathname: " + pathname + " filename: " + filename);
      try {
        fs.accessSync(filename, fs.F_OK);
        var fileStream = fs.createReadStream(filename);
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        response.writeHead(200, {
          'Content-Type': mimeType
        });
        fileStream.pipe(response);
      } catch (e) {
        // console.log('File not exists: ' + filename);
        response.writeHead(404, {
          'Content-Type': 'text/plain'
        });
        response.write('404 Not Found\n');
        response.end();
        return;
      }
      return;
    }
  });
  server.listen(main_port);
}

/*
  // Now set up the WebSocket seerver
  const WebSocket = require('ws');
  const ws_server = new WebSocket.Server({
    port: sock_port
  });

  // this holds a socket for each player
  let sockets = [];

  // socket call backs - .on fires ONLY on the inital connection or if
  // the player refreshes the page. If a refresh occurs the original socket
  // is deleted and a new socket created and 'pushed'.
  ws_server.on('connection', function(socket) {
    sockets.push(socket);

    // Both players requests for updates wind up here and are distinguished
    // by the current_player. CurrentGame processes the request info and then
    // returns the new state of play in 'resp_data' which is then vectored to
    // both sockets.
    socket.on('message', function(msg) {
      let player = CurrentGame.current_player;
      var play_data = JSON.parse(msg);
      let resp_data = CurrentGame.finish_the_play(player, play_data);
      console.log("socket message: " + resp_data);
      sockets.forEach(s => s.send(resp_data));
    });

    // When a socket closes, or disconnects, remove it from the array.
    socket.on('close', function() {
      sockets = sockets.filter(s => s !== socket);
    });
  });
*/
