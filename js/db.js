/*
   Copyright 2021 Richard Vassilaros 
*/

const { MongoClient } = require("mongodb");
// debug or release, etc
const quib_cfg = require('./js/quib_config.json');

let connection = null;
let database = null;

const dburl = !quib_cfg.staging ? 'mongodb://127.0.0.1:27017/quibble' : 'mongodb://127.0.0.1:27017/quibble.staging';

module.exports.connect = () => new Promise((resolve, reject) => {
    MongoClient.connect(dburl, { useUnifiedTopology: true }, function(err, db) {
        if (err) { reject(err); return; };
        resolve(db);
        connection = db;
        database = db.db("quibble");
    });
});

module.exports.get_db = () => {
    if(!connection || !database) {
        throw new Error('Call connect first!');
    }
    return database;
}

module.exports.get_conn = () => {
    if(!connection || !database) {
        throw new Error('Call connect first!');
    }
    return connection;
}
