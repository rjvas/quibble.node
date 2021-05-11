var Game = require('./game').Game;
var User = require('./user').User;
const db = require('./db');
var logger = require('./log').logger;

class ActiveGame {

  constructor(user1, user2, status, game) {
    this.user1 = user1;
    this.user2 = user2;

    this.status = status;
    this.port = ActiveGame.current_port++;

    if (!game) {
      this.game = new Game(null, user1.display_name, user2.display_name);
      this.game_id = null;
      this.game_id_str = "temp_game_id_str_" + this.game.id ;
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

  static current_port = 26101;

  static none = -1;
  static in_play = 1;
  static finished = 2;
  static waiting = 4;
  static invited = 8;
  static practice = 32;
  static remove_active = 64;

  static all_active = [];

  save(and_close, player) {
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
          this.user1.active_games = this.user1.active_games.filter(ag => ag.name != this.name);
          if (!(this.status & ActiveGame.practice)) {
            this.user2.active_games = this.user2.active_games.filter(ag => ag.name != this.name);
          }
          this.send_msg("Game saved and closed! Return to home_page!", player);
        }

        // if it was upserted, stuff the newly saved AGame into the user's saved_games list
        if (agame_result.upsertedId) {
          q = {"_id": agame_result.upsertedId._id};
          return new_agame_res = db.get_db().collection('active_games').findOne(q);
        }

      })
      .then((new_agame_res) => {
        if (new_agame_res) {
          // if it's a practice game, only one user/player
          this.user1.saved_games.push(new_agame_res);
          if (!(this.status & ActiveGame.practice)) {
            this.user2.saved_games.push(new_agame_res);
          }
          logger.debug("activegame.save new_agame_res: ", new_agame_res);
        }
      })
      .catch((e) => {
        logger.error("activegame.save: ", e);
      });
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

  send_msg(msg, player) {
    let data = [];
    data.push({"type" : "message"});
    data.push({"player" : player});
    data.push({"info" : msg});

    this.ws_server.clients.forEach(s => s.send(JSON.stringify(data)));

    logger.debug("activegame.send_msg: type: message player: " + player +
      "msg: " + msg);
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

          // look for an error on the play - if not found, save
          let found = resp_data.find(item => {
            return item.err_msg
          });
          if (!found) {
            logger.debug("activegame.socket.on.message: saving - " + a_game.name +
              " player: " + player.name);
            a_game.save(false, null);
          }

          let data = JSON.stringify(resp_data);
          a_game.ws_server.clients.forEach(s => s.send(data));
          logger.debug("activegame.socket.on.message: <socket.msg> port: " + a_game.port + " player: " + player.name);
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
        let a_game = ActiveGame.all_active.find(g => {
          return g.ws_server.clients.has(socket);
        });
        if (a_game) {
          a_game.connects = a_game.connects.filter(s => s !== socket);
          logger.debug("activegame.socket.on.close: a_game.name: " + a_game.name +
            " port: " + a_game.port + " player: " + player.name);
        }
      });
    });

    return ws_server;
  }

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
          logger.error("activegame.delete_game: No documents matched the query: ag._id: " +
            ag_jsons._id + " Deleted 0 documents.");
        }
      })
      .then((result) => {
        if (result && result.deletedCount === 1) {
          // remove from all_active list (if in)
          ActiveGame.all_active = ActiveGame.all_active.filter(
            ag => ag._id && !ag._id.equals(!ag_json._id)
          );
          logger.debug("activegame.delete_game: Successfully deleted game: " + ag_json._id +
            " and active_game document.");
          response.writeHead(302 , {
             'Location' : "/home_page?user=" + user.id.toHexString()
          });
          response.end();
        }
      })
      .catch((e) => {
        logger.error("activegame.delete_game: ", e);
      });
  }

  // builds and active game from json delivered from the db
  // this differs from newly created active_games that have
  // no _id
  static new_active_game_json(ag_json, user, response) {

    // don't allow a reload of an active game
    let found = ActiveGame.all_active.find(
      ag => {return ag._id && ag._id.equals(ag_json._id)}
    );
    if (found) {
      logger.error("activegame.new_active_game_json: Game already loaded: " +
        ag_json._id);
      return;
    }

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

          if (u1)
            u1.active_games.push(new_ag);
          if (u2 && u1 != u2)
            u2.active_games.push(new_ag);

          logger.debug("activegame.new_active_game_json game_id_str: " + new_ag.game_id_str);

          ActiveGame.all_active.push(new_ag);
          let player = user == u1 ? '/player1' : '/player2';

          response.writeHead(302 , {
             'Location' : player + "?game=" + new_ag.game_id_str +
              "&user=" + user.id.toHexString()
          });
          response.end();
        }
      })
      .catch((e) => {
        logger.error("activegame.new_active_game_json: ", e);
      });

    return new_ag;
  }

}

exports.ActiveGame = ActiveGame;
