var Game = require('./game').Game;
var User = require('./user').User;
const db = require('./db');

class ActiveGame {

  constructor(user1, user2, status, game) {
    this.user1 = user1;
    this.user2 = user2;

    this.status = status;
    this.port = ActiveGame.current_port++;

    if (!game) {
      this.game = new Game(null, user1.display_name, user2.display_name);
      this.game_id = null;
      this.game_id_str = "temp_game_id_str";
    }
    else {
      this.game = Game.new_game_json(game);
      this.game_id = game._id;
      this.game_id_str = game._id.toHexString();
    }

    this.name = this.game.name_time;

    this.connects = [];
    this.ws_server = this.setup_socket();
  }

  save(and_close) {
    let agame_result = null;
    let new_agame_res = null;
    let a_game_js = null;
    let game_js =  this.game.get_JSON();
    let q = { name_time : game_js.name_time };
    let update = { $set:  game_js};

    const options = { upsert: true };
    var result = db.get_db().collection("games").updateOne(q, update, options)
      .then((result) => {
        if (result) {
          a_game_js = this.get_JSON();
          if (result.upsertedId)
            a_game_js.game_id = result.upsertedId._id;
          q = { name: a_game_js.name };
          update = {$set : a_game_js};
          return agame_result = db.get_db().collection("active_games").updateOne(q, update, options)
        }
      })
      .then((agame_result) => {
        if (and_close) {
          // take it out of the active games list
          ActiveGame.all_active = ActiveGame.all_active.filter(ag => ag.name != this.name);

          // if it's a practice game, only one user/player
          this.user1.active_games = this.user1.active_games.filter(g => g.name_time != CurrentAGame.name);
          if (!(this.status & ActiveGame.practice)) {
            this.user2.active_games = this.user2.active_games.filter(g => g.name_time != CurrentAGame.name);
          }

          // if it was upserted, stuff the newly saved AGame into the user's saved_games list
          if (agame_result.upsertedId) {
            q = {"_id": agame_result.upsertedId._id};
            return new_agame_res = db.get_db().collection('active_games').findOne(q);
          }
        }
        console.dir(agame_result);
      })
      .then((new_agame_res) => {
        if (new_agame_res)
          console.dir(new_agame_res);
      })
      .catch((e) => {
        console.error(e);
      });

    console.dir(agame_result);
  }


  get_JSON() {
    return {
      "name" : this.name,
      "game_id" : this.game_id,
      "user1_id" : this.user1.id,
      "user2_id" : this.user2.id,
      "status" : this.status,
    }
  }

  setup_socket() {
    // Now set up the WebSocket seerver
    const WebSocket = require('ws');
    let ws_server = new WebSocket.Server({
      port: this.port
    });

    // socket call backs - .on fires ONLY on the inital connection or if
    // the player refreshes the page. If a refresh occurs the original socket
    // is deleted and a new socket created and 'pushed'.
    ws_server.on('connection', function(socket) {

      // Both players requests for updates wind up here and are distinguished
      // by the current_player. CurrentGame processes the request info and then
      // returns the new state of play in 'resp_data' which is then vectored to
      // both sockets.
      socket.on('message', function(msg) {
        let a_game = ActiveGame.all_active.find(g => {
          return g.ws_server.clients.has(socket);
        });
        if (a_game) {
          let player = a_game.game.current_player;
          var play_data = JSON.parse(msg);
          let resp_data = a_game.game.finish_the_play(player, play_data);
          a_game.ws_server.clients.forEach(s => s.send(resp_data));
          console.log("<socket.msg> port: " + a_game.port + " player: " + player.name);
          // console.log("socket message: " + resp_data);
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        let a_game = ActiveGame.all_active.find(g => {
          return g.ws_server.clients.has(socket);
        });
        if (a_game)
          a_game.connects = a_game.connects.filter(s => s !== socket);
      });
    });

    return ws_server;
  }

  static current_port = 26101;

  static none = -1;
  static in_play = 1;
  static finished = 2;
  static waiting = 4;
  static invited = 8;
  static admin = 16;
  static practice = 32;

  static all_active = [];

  static delete_game(ag_json, response, user) {
    let dbq = { "_id": ag_json.game_id };
    let result = db.get_db().collection("games").deleteOne(dbq)
      .then((result) => {
        if (result && result.deletedCount === 1) {
          // remove from saved_games list
          user.saved_games = user.saved_games.filter(
            g => g.name != ag_json.name
          );
          dbq = { "_id": ag_json._id };
          return result = db.get_db().collection("active_games").deleteOne(dbq);
        } else {
          console.log("No documents matched the query. Deleted 0 documents.");
        }
      })
      .then((result) => {
        if (result && result.deletedCount === 1) {
          // remove from all_active list (if in)
          ActiveGame.all_active = ActiveGame.all_active.filter(
            ag => ag._id && !ag._id.equals(!ag_json._id)
          );
          console.dir("Successfully deleted game and active_game document.");
          response.writeHead(302 , {
             'Location' : "/home_page"
          });
          response.end();
        }
      })
      .catch((e) => console.error(e));
  }

  // builds and active game from json delivered from the db
  // this differs from newly created active_games that have
  // no _id
  static new_active_game_json(ag_json, response) {
    let new_ag;
    let dbq = { "_id": ag_json.game_id };
    let game = db.get_db().collection('games').findOne(dbq)
      .then((game) => {
        if (game) {
          let u1 = User.current_users.find(u => {
            return u.id.equals(ag_json.user1_id);
          });
          let u2 = User.current_users.find(u => {
            return u.id.equals(ag_json.user2_id);
          });
          new_ag = new ActiveGame(u1, u2, ag_json.status, game);
          new_ag._id = ag_json._id;

          u1.active_games.push(new_ag);
          if (u1 != u2)
            u2.active_games.push(new_ag);

          // only look at games that have been saved (they have the _id)
          ActiveGame.all_active = ActiveGame.all_active.filter(
            ag => ag._id && !ag._id.equals(new_ag._id)
          );

          ActiveGame.all_active.push(new_ag);
          let player = new_ag.game.current_player == new_ag.game.player_1 ?
            '/player1' : '/player2';
          response.writeHead(302 , {
             'Location' : player
          });
          response.end();
        }
      })
      .catch((e) => console.error(e));
  }

}

exports.ActiveGame = ActiveGame;
