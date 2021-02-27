const http = require('http');
const pug = require('pug');
var fs = require('fs');
var url = require('url');
var path = require('path');

var Game = require('./js/game').Game;
var Word = require('./js/word').Word;

const port = 3042;
const hostname = '127.0.0.1';

var createServer_count = 0;

var CurrentGame = null;

var mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "json": "application/json",
  "css": "text/css"
};

var pug_grid = pug.compileFile('views/grid.pug');

var server = http.createServer((request, response) => {
  var pathname = url.parse(request.url).pathname;
  var filename = null;

  if (!CurrentGame || pathname.indexOf("new_game") != -1) {
    CurrentGame = new Game();
    pathname.indexOf("player1") != -1 ? pathname = "/player1" :
      pathname = "/player_2";
    console.log("NEW GAME!!");
    response.end(pug_grid({
      'game': CurrentGame,
      'Game' : Game,
      'Word' : Word,
      'player' : pathname}));
  }

  else if (pathname === "/player1" || pathname === "/player2") {
    response.writeHead(200, {
      'Content-Type': 'text/html'
    });
    console.log("pathname: " + pathname + " filename: " + filename);
    response.end(pug_grid({
      'game': CurrentGame,
      'Game' : Game,
      'Word' : Word,
      'player' : pathname}));

  } else if (pathname.indexOf("json") > -1 &&
              request.method === 'POST') {
    var body = '';
    request.on('data', function (data) {
      body += data;
    });
    request.on('end', function () {
      var play_data = JSON.parse(body);
      let player = null;
      // which player?
      pathname.indexOf("player1") != -1 ? player = CurrentGame.player_1 :
        player = CurrentGame.player_2;
      let resp_data = CurrentGame.finish_the_play(player, play_data);
      response.writeHead(200, {'Content-Type':'application/json'});
      console.log('sent: ' + resp_data);
      response.end(resp_data);
    });
    console.log("pathname: " + pathname + " filename: " + filename);
  }

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
server.listen(port);
