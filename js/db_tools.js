/*
   Copyright 2021 Richard Vassilaros 
*/

const db = require('./db');
var logger = require('./log').logger;

class DBtools {
  static repairDroppedGame() {
    let dropped = db.active_games.find({game_id : null}).
      then((dropped) => {
        logger.debug("DBtools.repairDroppedGame: ", dropped);
      }).catch((e) => console.error(e));
  }
}

exports.DBtools = DBtools;
