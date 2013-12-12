var mongo = require('./mongo')
  , Q = require('q');

var db = {
  api : require('./api'),
  app: require('./app'),
  change_log : require('./change_log'),
  upstream: require('./upstream')
};

module.exports = db;
