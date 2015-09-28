var connection, mongoose;

mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_TEST_URL || 'mongodb://localhost/test');

connection = mongoose.connection;

before(function(done) {
  return connection.on('open', function() {
    return connection.db.dropDatabase(done);
  });
});

after(function(done) {
  return connection.close(done);
});

module.exports = connection.db;
