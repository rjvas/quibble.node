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
// const pug = require('pug');
var fs = require('fs');
var url = require('url');
var path = require('path');
const pug = require('pug');

// pug is a template engine that can pre-compile template defs
var pug_grid = pug.compileFile('views/grid.pug');
var pug_welcome = pug.compileFile('views/welcome.pug')

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
      let user = User.current_users.find(u => {
        return u.request_address == remote_addr;
      });
      if (user) {
        CurrentAGame = new ActiveGame(user, user, ActiveGame.in_play|ActiveGame.practice);
        ActiveGame.all_active.push(CurrentAGame);
        pathname.indexOf("player1") != -1 ? pathname = "/player1" :
          pathname = "/player2";
        console.log("NEW GAME!!");
        response.end(pug_grid({
          'is_practice' : true,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));
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

    // This will refresh the player's page with the currrent state of CurrentGame
    else if (pathname === "/player1" || pathname === "/player2") {
      CurrentAGame == null;
      let user = User.current_users.find(u => {
        return u.request_address == remote_addr;
      });
      if (user) {
        CurrentAGame = ActiveGame.all_active.find(g => {
          return g.user1 == user || g.user2 == user;
        });
      }

      if (CurrentAGame) {
        response.writeHead(200, {
          'Content-Type': 'text/html'
        });
        console.log("pathname: " + pathname + " filename: " + filename);
        response.end(pug_grid({
          'is_practice' : CurrentAGame.status & ActiveGame.practice,
          'port' : CurrentAGame.port,
          'game': CurrentAGame.game,
          'Game' : Game,
          'Word' : Word,
          'player' : pathname}));
        }
    }

    // error handling
    else {
      // DEBUG: Chrome sends a lot of these while debugging ...
      if (pathname == "/json" || pathname == "/json/version") return;

      filename = path.join(process.cwd(), pathname);
      console.log("pathname: " + pathname + " filename: " + filename);
      try {
        fs.accessSync(filename, fs.F_OK);
        var fileStream = fs.createReadStream(filename);
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        response.writeHead(200, {
          'Content-Type': mimeType
        });
        fileStream.pipe(response);
      } catch (e) {
        console.log('File not exists: ' + filename);
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
