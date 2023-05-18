/*
   Copyright 2021 Richard Vassilaros 
*/

const { MongoClient } = require("mongodb");

let connection = null;
let database = null;

const dburl = 'mongodb://127.0.0.1:27017/quibble';

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
