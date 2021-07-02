var Game = require('./game').Game;
var User = require('./user').User;
const db = require('./db');
var logger = require('./log').logger;
const {exec} = require('child_process');

class ActiveGame {

  constructor(user1, user2, status, game) {
    // DEBUG -  force a load at startup - see heist.js
    if (!user1 || !user1)
      return;

    this.user1 = user1;
    this.user2 = user2;

    this.status = status;
    this.port = ActiveGame.current_port++;

    if (!game) {
      this.game = new Game(null, user1.display_name, user2.display_name);
      this.game_id = null;
      this.game_id_str = this.game.name_time;
      }
    else {
      this.game = Game.new_game_json(game);
      this.game_id = game._id;
      this.game_id_str = game._id.toHexString();
    }

    this.chat_text = "<b>Salutations Worderists!</b>";
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
  static admin_peek = 128;

  static admin_peek_socket = null;

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

          logger.debug("activegame.save (1) " + a_game_js.name + " result: ", result);

          return agame_result = db.get_db().collection("active_games").updateOne(q, update, options)
        }
      })
      .then((agame_result) => {
        // if it was upserted, stuff the newly saved AGame into the user's saved_games list
        logger.debug("activegame.save (2) agame_result: ", agame_result);

        if (agame_result.upsertedId) {
          q = {"_id": agame_result.upsertedId._id};
          return new_agame_res = db.get_db().collection('active_games').findOne(q);
        }

      })
      .then((new_agame_res) => {
        if (new_agame_res) {
          // update this
          this.game_id = new_agame_res.game_id;
          this.game_id_str = this.game_id.toHexString();
          this.game.id = this.game_id;
          this.user1.saved_games.push(new_agame_res);
          // if it's a practice game, only one user/player
          if (!(this.status & ActiveGame.practice))
            this.user2.saved_games.push(new_agame_res);
          logger.debug("activegame.save (3) new_agame_res: ", new_agame_res);
        }
      })
      .catch((e) => {
        logger.error("activegame.save: " + a_game_js.name, e);
      });
  }

  get_JSON() {
    return {
      "name" : this.name,
      "game_id" : this.game_id,
      "user1_id" : this.user1 ? this.user1.id : null,
      "user2_id" : this.user2 ? this.user2.id : null,
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

  log_pre(player_name, data) {
    console.log("activegame.onmessage pre-finish_the_play player: ", player_name);
    logger.debug("activegame.onmessage pre-finish_the_play player: ", player_name);
    console.dir(data);
    logger.debug(data);
  }

  log_post(player_name, data) {
    console.log("activegame.onmessage post-finish_the_play player: ", player_name);
    logger.debug("activegame.onmessage post-finish_the_play player: ", player_name);

    data.forEach((item, i) => {
      console.dir(item);
      logger.debug(item);
    });
    console.log("new_tiles:");
    logger.debug("new_tiles");
    if (data[3] && data[3].new_data &&
        data[3].new_data[1] && data[3].new_data[1].new_tiles)
      data[3].new_data[1].new_tiles.forEach((item, i) => {
        console.dir(item);
        logger.debug(item);
      });

    console.log("play_data:");
    logger.debug("play_data");
    if (data[3] && data[3].new_data &&
        data[3].new_data[6] && data[3].new_data[6].play_data)
      data[3].new_data[6].play_data.forEach((item, i) => {
        console.dir(item);
        logger.debug(item);
      });
  }

  cheat(socket, play_data) {
    let user = play_data[1].player;
    let tpl = play_data[2].info;
    let player = null;

    if (this.status & ActiveGame.practice) {
      player = this.game.current_player;
      play_data[1].player = this.user1.display_name;
    }
    else if (this.user1 && this.user1.id.toHexString() == user) {
      player = this.game.player_1;
      play_data[1].player = this.user1.display_name;
    }
    else if (this.user2) {
      player = this.game.player_2;
      play_data[1].player = this.user2.display_name;
    }

    // the 'tpl' - template - is for a regex of a specific form:
    // . matches any char in the user's hand
    // a-z are literals
    let exec_str = "grep -o -E '\"";
    let ph = "[";
    player.tiles.forEach((item, i) => {
      if (item)
        ph += item.char.toLowerCase();
    });
    ph += "]";

    for (let i=0; i<tpl.length; i++) {
      if (tpl[i] == '*') {
        exec_str += ph + '*';
      }
      else if (tpl[i] == '.') {
        exec_str += ph;
      }
      else if (tpl[i] == " ")
        exec_str += "[a-z]";
      else {
        exec_str += tpl[i];
      }
    };

    exec_str += "\"\'" + " ./js/*.json";
    // console.log(exec_str);

    exec(exec_str, (err, stdout, stderr) => {
      if (err) {
        play_data[2].info = "No match for " + exec_str;
        socket.send(JSON.stringify(play_data));
        // console.error(err)
      } else {
       // the *entire* stdout and stderr (buffered)
       if (stdout) {
         play_data[2].info = stdout;
         socket.send(JSON.stringify(play_data));
       }
       // console.log(`stdout: ${stdout}`);
       // console.log(`stderr: ${stderr}`);
      }
    });
  }

  peek(socket, play_data) {
    let type = play_data.shift();
    let state = play_data.shift();

    if (type.type == "peek" && state.state == "on") {
      this.status |= ActiveGame.admin_peek;
      this.admin_peek_socket = socket;
    }
    else if (type.type == "peek" && state.state == "off") {
      if (this.status & ActiveGame.admin_peek)
        this.status ^= ActiveGame.admin_peek;
      this.admin_peek_socket = null;
    }
    console.log("activegame.peek");
  }

  setup_socket() {
    // Now set up the WebSocket seerver
    const WebSocket = require('ws');
    let ws_server = new WebSocket.Server({
      port: this.port
    });

    // socket call backs - .on fires ONLY on the inital connection or if
    // the player refreshes the page. If a refresh occurs the original socket
    // is deleted and a new socket created and 'pushed'
    ws_server.on('connection', function(socket) {

      // Both players requests for updates wind up here and are distinguished
      // by the current_player. CurrentGame processes the request info and then
      // returns the new state of play in 'resp_data' which is then vectored to
      // both sockets.
      socket.on('message', function(msg) {
        let a_game = ActiveGame.all_active.find(g => {
          return g && g.ws_server && g.ws_server.clients && 
            g.ws_server.clients.has(socket);
        });
        if (a_game) {
          let resp_data = null;
          let player = a_game.game.current_player;
          var play_data = JSON.parse(msg);
          let player_name = "";

          let type = play_data[0] && play_data[0].type ? play_data[0].type :
            "unknown"; 

          // got a chat message
          if ( type == "chat") {
            // get the player name
            if (play_data[1] && play_data[1].player != "sysadmin") {
              let user = play_data[1].player;
              if (a_game.user1 && a_game.user1.id.toHexString() == user)
                player_name = a_game.user1.display_name;
              else if (a_game.user2)
                player_name = a_game.user2.display_name;
              play_data[1].player = player_name;
            } else {
              player_name = play_data[1].player;
            }

            a_game.chat_text += "<br><br><b> " + player_name + " </b>:<br> " + play_data[2].info;
            resp_data = play_data;
          }
          else if (type == "cheat") {
            a_game.cheat(this, play_data);
            return;
          }
          else if (type == "peek") {
            a_game.peek(this, play_data);
            return;
          }
          else {
            // a_game.log_pre(player, play_data);
            if (a_game.status & ActiveGame.admin_peek) {
              let peek_data = {
                "peek" : "Client to Server",
                "play_data" : play_data
              };
              if (a_game.admin_peek_socket)
                a_game.admin_peek_socket.send(JSON.stringify(peek_data));
            }

            resp_data = a_game.game.finish_the_play(player, play_data);

            if (a_game.status & ActiveGame.admin_peek) {
              let peek_data = {
                "peek" : "Server to Client",
                "resp_data" : resp_data
              };
              if (a_game.admin_peek_socket)
                a_game.admin_peek_socket.send(JSON.stringify(peek_data));
            }

            // a_game.log_post(player, resp_data);

            // look for an error on the play - if not found, save
            let found = resp_data.find(item => {
              return item.err_msg
            });
            if (!found) {
              logger.debug("activegame.socket.on.message: saving - " + a_game.name +
                " player: " + player.name);
              a_game.save(false, null);
            }
          }

          let data = JSON.stringify(resp_data);
          a_game.ws_server.clients.forEach(s => s.send(data));
          logger.debug("activegame.socket.on.message: <socket.msg> port: " + a_game.port + " player: " + player.name);
        }
      });

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', function() {
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
          let player = null;
          ActiveGame.all_active.push(new_ag);
          if (new_ag.status & ActiveGame.practice) {
            new_ag.game.current_player == new_ag.game.player_1 ?
              player = "/player1" : player = "/player2";
          }
          else {
            player = user == u1 ? '/player1' : '/player2';
          }

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
exports.AllActiveGames = ActiveGame.all_active;
