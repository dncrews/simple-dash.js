/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

/**
 * Dependencies
 */
var request = require('superagent')
  , express = require('express')
  , url = require('url')
  , stylus = require('stylus')
  , debug = require('debug')('app:routing');


/**
 * Local Vars
 */
var app = module.exports = express()
  , Logger = require('./lib/logger')
  , change_log = require('./lib/change_log')
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
 * TODO:
 * 1) Poll heroku status dashboard somehow & display info here... (using Heroku CLI)
 * 2)
 * 3) Poll Splunk API and get metrics from that (like how umpire does it with librato) (MAYBE)

 * consi

MVP1
 * we should be able to get the user-agent or source to see how we can distinguish between the different sources (Librato vs Papertrail vs Logentries, etc)


 LATER
 * 3) Add persistent API status (mongo)
 * consider having Stathat as an outlet (for beyond simple graphs)

 * https://www.webscript.io/

 *
 */


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

  if (ua.match("Marrow")) src = "marrow";

  if (ua.match("Java")) src = "jenkins"; //TODO: add the IP Address

  if (src) {
    // Not returning. We want to parse after sending response
    res.send(200);
  } else {
    return res.send(507); //not posted
  }


  //save the data
  change_log.save(req.body, src).then(function success(stuff) {
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
