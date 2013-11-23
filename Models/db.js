/* globals require,console,module */
'use strict';

var mongoose = require('mongoose');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.info('Connection Successful');
});

module.exports = db;
