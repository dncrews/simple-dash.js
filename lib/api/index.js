/**
 * Dependencies
 */
var express = require('express');

/**
 * Local Vars
 */
var app = module.exports = express();

app.use(function (req, res, next) {
  // TODO: add error checking so we don't cache error responses...
  // if (! ('JSONResponcs' in res) ) {
  //   return next();
  // }
  var expires = process.env.API_EXPIRES || 0;
  res.setHeader('Cache-Control', 'public, max-age=' + expires);
  return next();
});

app.use('/app', require('./api.app.js'));
app.use('/service', require('./api.service.js'));
app.use('/upstream', require('./api.upstream.js'));
app.use('/event', require('./api.change.js'));
app.use('/change', require('./api.change.js'));
app.use('/performance', require('./api.performance.js'));
