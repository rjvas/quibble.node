/*
   Copyright 2021 Richard Vassilaros 
*/

const winston = require('winston');
const path = require('path');

//
// Logging levels
//
const config = {
  levels: {
    error: 0,
    debug: 1,
    warn: 2,
    data: 3,
    info: 4
  },
  colors: {
    error: 'red',
    debug: 'blue',
    warn: 'yellow',
    data: 'grey',
    info: 'green'
  }
};

winston.addColors(config.colors);

const logger = winston.createLogger({
  levels: config.levels,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.simple()
  ),

  transports: [
    new winston.transports.Console({level : "error"}),
    new winston.transports.File({
      filename: path.join(__dirname + "/../", 'letsquibble.log'),
      level: 'info',
      maxsize: 2000000,
      maxFiles: 10,
      tailable: true,
      zippedArchive: true
    })
  ]
});

const WT_DEBUG = true;

module.exports.logger = logger;
module.exports.WT_DEBUG = WT_DEBUG;
