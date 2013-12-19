/**
 * Module Dependencies
 */
var express = require('express')
  , stylus = require('stylus')
  , debug = require('debug')('marrow:routing');

/**
 * Local Dependencies
 */
var db = require('./Models/db') // Configures Mongoose
  , Logger = require('./lib/logger')
  , change_logger = require('./lib/change_logger');

/**
 * Local Declarations
 */
var app = module.exports = express()
  , PORT = process.env.PORT || 5000;

/**
 * Express Configuration
 */
app.use(express.json());
app.use(express.urlencoded());
app.use(stylus.middleware(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


/**
 * Angular Dashboard
 */
app.get('/', function(req, res) {
  debug('Loading angular page');
  res.render('layout');
});


app.get('/partials/:partial', function(req, res) {
  var partial = req.params.partial;
  res.render('partials/' + partial, function(err, html) {
    debug('Attempting partial load: ' + partial);
    if (err) {
      debug('partial failed');
      res.send(404);
    } else {
      debug('sending partial');
      res.end(html);
    }
  });
});

app.use('/api', require('./lib/api'));

/**
 * Adding statuses to the log
 *
 * Should alwasy return a responeCode
 */
app.post('/', function(req, res){
  debug('POST /: ' + req);
  new Logger(req.body).log(function(code) {
    debug('Logger code: ' + code);
    res.send(code);
  });
});

/**
 * Adding items to the changelog
 *
 * Should alwasy return a responseCode
 */
app.post('/change', function(req, res){
  debug('POST /change: ', req);
  var src = false;
  //TODO: have a  lookup table or something that matches up repos to appName in heroku...
  var ua = req.headers['user-agent'];
  debug("headers", req.headers);
  debug("user-agent", ua);


  if (ua.match("GitHub Hookshot")) src = "github"; //TODO: add the IP Address
  if (ua.match("Java")) src = "jenkins"; //TODO: add the IP Address

  // if (! src) return res.send(507);
  if (! src) src = 'github';
  // Not returning. We want to parse after sending response
  res.send(200);

  //save the data
  change_logger(req.body, src).then(function success(stuff) {
    debug('successfully saved change to DB');
    res.send(201);
  }, function fail(err) {
    debug('change post failure: ', err);
    res.send(500, 'Internal Server Error 500: ' + err.name + ':' + err.message);
  });
});

app.listen(PORT, function() {
  console.info("Listening on " + PORT);
});
