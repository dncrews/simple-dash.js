/**
 * Dependencies
 */
var express = require('express');

/**
 * Local Vars
 */
var app = module.exports = express();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');

  if ('OPTIONS' === req.method) return res.send(200);

  next();
});

// app.options('/*', function(req, res) {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.end('');
// });

app.use('/app', require('./api.app.js'));
app.use('/service', require('./api.service.js'));
app.use('/upstream', require('./api.upstream.js'));
app.use('/event', require('./api.change.js'));
app.use('/change', require('./api.change.js'));
