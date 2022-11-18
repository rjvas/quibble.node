const { MongoClient } = require("mongodb");

let connection = null;
let database = null;

const dburl = 'mongodb://localhost:27017/heist';

module.exports.connect = () => new Promise((resolve, reject) => {
    MongoClient.connect(dburl, { useUnifiedTopology: true }, function(err, db) {
        if (err) { reject(err); return; };
        resolve(db);
        connection = db;
        database = db.db("heist");
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
