var mongoose = require('mongoose');

var db = mongoose.connection;
var currentDb;

console.log(process.env.NODE_ENV);
// if (process.env.NODE_ENV === 'development') {
//   currentDb = 'mongodb://localhost/simple-dash';
// }
// else {
  currentDb = process.env.MONGOHQ_URL;
// }

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.info('Connection Successful');
});

mongoose.connect(currentDb);

module.exports = db;
