/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

/**
 * Dependencies
 */
var request = require('superagent')
  , express = require('express')
  , request = require('superagent')
  , url = require('url')
  , Q = require('q');

/**
 * Local Vars
 */
var app = module.exports = express()
  , port = process.env.PORT || 5000
  , baseUrl = process.env.BASE_URL || 'localhost:' + port
  , db = require('./lib/mongoClient')
  , bucketLength = 300000; // 5 minutes

/**
 * Express Configuration
 */
app.use(express.bodyParser());
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


//BAD NEWS: SCRIPT ALERTS ONLY PASS PARAMETERS.

/**
 * TODO:
 * 0) Send alerts from splunk to dashboard, and log them there... Right now just dump into logs?
    - push the e-mail 5xx alert one and show what apps are affected...
    - Store in DB (very simply), and show them there...
 * 1) Poll heroku status dashboard somehow & display info here... (using Heroku CLI)
 * 2)
 * 3) Poll Splunk API and get metrics from that (like how umpire does it with librato)

 * consi

MVP1
 * we should be able to get the user-agent or source to see how we can distinguish between the different sources (Librato vs Papertrail vs Logentries, etc)


 LATER
 * 3) Add persistent API status (mongo)
 * consider having Stathat as an outlet (for beyond simple graphs)

 * https://www.webscript.io/

 *
 */

app.get('/home', function(req, res, next){
  res.format({
    /**
     * Dashboard View
     */
    'text/html': function() {
      getRecent().then(function(appData) {
        console.log(appData);
        res.render('dashboard', {appData : appData})
      });
    },
 
    /**
     * JSON View
     * It seems like this might be consumed, so
     * I assume we could just rely on the accept header.
     * Would a separate "API" be better?
     * A: YES. MUCH BETTER.
     */
    'application/json': function() {
      getRecent().then(function(data) {
        res.send(data);
      });
    }
  });
});
 
 


/**
 * Main dashboard page
 */
app.get('/', function(req, res, next){
  res.format({
    /**
     * Dashboard View
     */
    'text/html': function() {
      getRecent().then(function(appData) {
        res.render('dashboard_home', {appData : appData});
      });
    },

    /**
     * JSON View
     * It seems like this might be consumed, so
     * I assume we could just rely on the accept header.
     * Would a separate "API" be better?
     * A: YES. MUCH BETTER.
     */
    'application/json': function() {
      getRecent().then(function(data) {
        res.send(data);
      });
    }
  });
});

/**
 * Detail dashboard page
 */
app.get('/detail/:app_id', function(req, res){
  // console.log("req.body", req.body);
  res.render('dashboard_detail', {app_id: req.params.app_id});
  // console.log('Splunk Alert Received: alert_name=' + req.body.alert_title + ' event_count=' + req.body.event_count)
  // console.log("req.body.username", req.body.username);
  //res.send(req.body);

});


/**
 * Adding statuses to the log
 */
app.post('/', function(req, res){
  // TODO: I think we should parse the response now into app-specific as well
  var content = req.body
    , alertTitle = content.alert_title.replace(/\./g, ':')
    , timestamp = new Date().getTime()
    , timeBucket = Math.floor(timestamp/bucketLength) // This should create buckets at 5-minute intervals
    , dfds = []
    , i, l, _rel;

  if (typeof content.data === 'string') {
    try {
      content.data = JSON.parse(content.data);
    } catch (e) {
      console.warn(e);
      return res.send(500);
    }
  }

  dfds.push(createRawStatus());
  dfds.push(createRawBucket());

  for (i=0, l=content.data.length; i<l; i++) {
    _rel = content.data[i];
    dfds.push(createAppStatus(_rel));
    dfds.push(createAppBucket(_rel));
  }
  Q.all(dfds).then(function() {
    res.send(201);
  });

  /**
   * This gets called in the other methods.
   * I just want to make sure the db is finished saving
   * before I respond saying so.
   */
  function getAsyncResolve(dfd) {
    return function () {
      dfd.resolve();
    };
  }

  /**
   * Creates the record in rawStatus
   * This is site-wide data
   */
  function createRawStatus() {
    var dfd = Q.defer();
    content.timestamp = timestamp;
    db.rawStatus.save(content, getAsyncResolve(dfd));
    return dfd.promise;
  }
  /**
   * Creates the record in rawBucket
   * This is site-wide data in sets
   */
  function createRawBucket() {
    var dfd = Q.defer();
    db.rawBucket.findOne({ "timeBucket" : timeBucket }, function(err, doc) {
      doc = doc || { "timeBucket" : timeBucket };
      doc[alertTitle] = content.data;
      db.rawBucket.save(doc, getAsyncResolve(dfd));
    });
    return dfd.promise;
  }

  /**
   * This creates a record in appStatus
   * These are app-specific records
   */
  function createAppStatus(data) {
    var dfd = Q.defer();
    data.alertTitle = content.alert_title;
    data.timestamp = timestamp;
    db.appStatus.save(data, getAsyncResolve(dfd));
    return dfd.promise;
  }

  /**
   * This creates a record in appBucket
   * These are app-specific records in sets
   */
  function createAppBucket(data) {
    var appName = data.fs_host
      , dfd = Q.defer();
    db.appBucket.findOne({ "timeBucket" : timeBucket, "appName" : appName }, function(err, doc) {
      doc = doc || { "timeBucket" : timeBucket, "appName" : appName };
      doc[alertTitle] = data;
      db.appBucket.save(doc, getAsyncResolve(dfd));
    });
    return dfd.promise;
  }
});

/**
 * This should return the app's history in "buckets"
 */
app.get('/history/:appName', function(req, res, next) {
  db.appBucket.find({ "appName" : req.params.appName }).sort({ timeBucket : -1 }, function(err, docs) {
    res.send(docs);
  });
});

/**
 * This shows ALL entries in the rawStatus
 */
app.get('/sample', function(req, res, next) {
  db.appBucket.find(function(err, data) {
    res.send(data);
  });
});

/**
 * This shows the most recent entries in rawStatus
 */
app.get('/recent', function(req, res, next) {
  getRecent().then(function(data) {
    res.send(data);
  });
});


function getRecent() {
  var dfd = Q.defer()
    , appNames = [];

  // Get all (200 most recent) time buckets for all apps
  db.appBucket.find().sort({ "timeBucket" : -1, "appName": 1 }).limit(200, function(err, docs) {
    // Remove all duplicate appNames
    docs = docs.filter(function(el) {
      if (appNames.indexOf(el.appName) === -1) {
        appNames.push(el.appName);
        return true;
      }
      return false;
    });
    dfd.resolve(docs);
  });

  return dfd.promise;
}

/**
 * Serve superagent to the browser, when necessary
 */
// app.get('/js/superagent.js', function(req, res, next) {
//   res.sendfile(__dirname + '/node_modules/superagent/superagent.js');
// });

app.listen(port, function() {
  console.info("Listening on " + port);
});


/**
 * Splunk alert:
 req.body { alert_title: 'status.dashboard.frontier.response_times',data:'[{"fs_host":"fs-archives-prod","p50":"20","p90":"485","p95":"580","max":"3160"},{"fs_host":"fs-ask-prod","p50":"41","p90":"105","p95":"126","max":"2829"},{"fs_host":"fs-catalog-prod","p50":"78","p90":"185","p95":"312","max":"541"},{"fs_host":"fs-collection-prod","p50":"146","p90":"340","p95":"410","max":"1639"},{"fs_host":"fs-first-run-prod","p50":"244","p90":"540","p95":"1200","max":"4592"},{"fs_host":"fs-header-footer-prod","p50":"5","p90":"15","p95":"21","max":"1093"},{"fs_host":"fs-home-prod","p50":"31","p90":"450","p95":"1000","max":"4855"},{"fs_host":"fs-hr-prod","p50":"830","p90":"1640","p95":"2100","max":"8754"},{"fs_host":"fs-identity-prod","p50":"8","p90":"587","p95":"1803","max":"2153"},{"fs_host":"fs-image-prod","p50":"310","p90":"720","p95":"1000","max":"5445"},{"fs_host":"fs-lls-prod","p50":"186","p90":"1400","p95":"2000","max":"5060"},{"fs_host":"fs-photos-prod","p50":"160","p90":"730","p95":"1000","max":"19731"},{"fs_host":"fs-registration-prod","p50":"204","p90":"1157","p95":"1619","max":"1870"},{"fs_host":"fs-search-prod","p50":"135","p90":"135","p95":"135","max":"135"},{"fs_host":"fs-temple-prod","p50":"888","p90":"1602","p95":"2039","max":"4245"},{"fs_host":"fs-tree-prod","p50":"7","p90":"15","p95":"25","max":"185"},{"fs_host":"fs-waypoint-prod","p50":"110","p90":"290","p95":"350"

 * Librato alert:
 req.body { payload: '{"alert":{"id":167489},"metric":{"name":"router.service.p95","type":"gauge"},"measurement":{"value":2079.777777777778,"source":"fs-home-prod"},"trigger_time":1378415400}' }


 * Logentries alert
 req.body { payload: '{"log": {"name": "fs-home-prod"}, "host": {"hostname": "nolocation", "name": "Heroku"}, "event": {"s": 2489601672, "m": "335 <158>1 2013-09-05T21:17:18.402608+00:00 heroku router - - at=error code=H12 desc=\\"Request timeout\\" method=GET path=/api/history host=fs-home-prod.herokuapp.com request_id=6f23b9f4d9ba712a83d1b563c66c86c2 fwd=\\"10.34.20.130, 204.9.225.10\\" dyno=web.5 connect=11ms service=30002ms status=503 bytes=0", "t": 1378415838469}, "context": [{"s": 2488541896, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "291 <158>1 2013-09-05T21:15:46.397340+00:00 heroku router - - at=info method=GET path=/ host=fs-home-prod.herokuapp.com request_id=3705f48acff6104d26b1e634d5345c45 fwd=\\"128.187.97.22, 204.9.225.2\\" dyno=web.1 connect=2ms service=663ms status=200 bytes=9671", "t": 1378415836790}, {"s": 2488579080, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "293 <158>1 2013-09-05T21:17:16.802038+00:00 heroku router - - at=info method=GET path=/ host=fs-home-prod.herokuapp.com request_id=06a7b160421f200b6b488dc479a155b9 fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.3 connect=3ms service=333ms status=200 bytes=7978", "t": 1378415836896}, {"s": 2488632776, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "211 <13>1 2013-09-05T21:17:16.726262+00:00 app web.2 - - at=info heroku_request_id=ee640d75aa7c27893b37bf86be884daa request_id=05/Sep/2013:21:17:16.705va-dlb020A21FE86D2862B72", "t": 1378415837023}, {"s": 2488642632, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "211 <13>1 2013-09-05T21:17:16.983923+00:00 app web.3 - - at=info heroku_request_id=6c5ba524f8c3148f6996d3df8fd8fe4e request_id=05/Sep/2013:21:17:16.731va-dlb020A21FE84CD572B72", "t": 1378415837044}, {"s": 2488678088, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "120 <13>1 2013-09-05T21:17:16.729898+00:00 app web.2 - - Returning cached en images.", "t": 1378415837121}, {"s": 2488679176, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "291 <158>1 2013-09-05T21:17:17.040229+00:00 heroku router - - at=info method=GET path=/ host=fs-home-prod.herokuapp.com request_id=414ace0f18a32b5045b32a6ca939ec7c fwd=\\"83.90.174.178, 204.9.225.3\\" dyno=web.4 connect=5ms service=132ms status=200 bytes=7981", "t": 1378415837130}, {"s": 2488805384, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "300 <158>1 2013-09-05T21:17:17.323620+00:00 heroku router - - at=info method=GET path=/api/history host=fs-home-prod.herokuapp.com request_id=50d542a10c9e773c22314ed055deaa68 fwd=\\"68.42.85.46, 204.9.225.2\\" dyno=web.3 connect=2ms service=20029ms status=500 bytes=39", "t": 1378415837398}, {"s": 2488812488, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "148 <13>1 2013-09-05T21:17:17.305595+00:00 app web.3 - - { [Error: timeout of 20000ms exceeded] timeout: 20000 }", "t": 1378415837410}, {"s": 2489124104, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "314 <158>1 2013-09-05T21:15:48.432018+00:00 heroku router - - at=info method=GET path=/api/photos/locale/en/15 host=fs-home-prod.herokuapp.com request_id=9c877c60504d86f3fe9833373c2c24ad fwd=\\"71.199.29.247, 204.9.225.2\\" dyno=web.1 connect=2ms service=409ms status=200 bytes=1866", "t": 1378415837888}, {"s": 2489446024, "r": "7950a785-5844-4ff9-95e9-42fdc41dae91", "m": "211 <13>1 2013-09-05T21:17:18.243123+00:00 app web.3 - - at=info heroku_request_id=88e7f58f226096227ff581e597af72c8 request_id=05/Sep/2013:21:17:18.066va-dlb030A21FE86970D0955", "t": 1378415838298}], "alert": {"name": "Request Timeout (503) (1x)"}}' }


 * Papertrail Alert
 req.body { payload: '{"min_time_at":"2013-09-05T05:32:56Z","reached_record_limit":true,"min_id":"312148301309104143","saved_search":{"html_search_url":"https://papertrailapp.com/searches/752963","name":"H12: Request timeout (503)","id":752963,"html_edit_url":"https://papertrailapp.com/searches/752963/edit","query":"status=503"},"max_id":"312387317035982856","events":[{"display_received_at":"Sep 04 23:32:56","source_ip":"107.20.120.47","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=55eabcdd1cfe39d02148c9ae8030e61d fwd=\\"67.183.215.15, 204.9.225.3\\" dyno=web.3 connect=2ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312148301309104143,"received_at":"2013-09-04T23:32:56-06:00"},{"display_received_at":"Sep 05 00:20:13","source_ip":"54.226.40.134","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=82afc1f25e7c2f678cdbe2b71ef6820c fwd=\\"10.34.20.130, 204.9.225.2\\" dyno=web.1 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"
heroku/router","id":312160197198241796,"received_at":"2013-09-05T00:20:13-06:00"},{"display_received_at":"Sep 05 08:42:30","source_ip":"54.234.6.80","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=74c06dc881169a33521ed5c32127eec0 fwd=\\"187.78.244.106, 204.9.225.3\\" dyno=web.3 connect=8ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312286600384241666,"received_at":"2013-09-05T08:42:30-06:00"},{"display_received_at":"Sep 05 08:54:28","source_ip":"54.224.248.17","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=f802388ccb948d63975a549a66c4394a fwd=\\"216.49.181.254, 204.9.225.3\\" dyno=web.2 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312289613157040133,"received_at":"2013-09-05T08:54:28-06:00"},{"display_received_at":"Sep 05 08:54:41","source_ip":"23.20.69.180","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=19a9d3ac78f176fd25bd2122297c0aa6 fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.1 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312289667137691650,"received_at":"2013-09-05T08:54:41-06:00"},{"display_received_at":"Sep 05 09:14:04","source_ip":"54.221.10.40","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=d7064445686c5681d2cfa8102f2f9558 fwd=\\"71.53.171.191, 204.9.225.2\\" dyno=web.1 connect=3ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312294546610651138,"received_at":"2013-09-05T09:14:04-06:00"},{"display_received_at":"Sep 05 09:29:40","source_ip":"54.234.6.80","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=c8cb64c086a160ad837fface1224aa12 fwd=\\"216.49.181.254, 204.9.225.3\\" dyno=web.3 connect=6ms service=30005ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312298472093278218,"received_at":"2013-09-05T09:29:40-06:00"},{"display_received_at":"Sep 05 09:31:56","source_ip":"50.16.17.29","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=4937c88ac6ab852e10d011f32baca5e5 fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.2 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312299041046421511,"received_at":"2013-09-05T09:31:56-06:00"},{"display_received_at":"Sep 05 09:34:41","source_ip":"54.242.7.251","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=b181a04c1750fcafa497d15bdbf5166e fwd=\\"216.49.181.254, 204.9.225.2\\" dyno=web.3 connect=0ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312299736243920935,"received_at":"2013-09-05T09:34:41-06:00"},{"display_received_at":"Sep 05 09:49:11","source_ip":"54.226.118.174","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=4081555b7063e277564724623cb16c28 fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.1 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312303381740081162,"received_at":"2013-09-05T09:49:11-06:00"},{"display_received_at":"Sep 05 09:49:17","source_ip":"107.20.120.47","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=c92cd9ceb59231997d3e469c54edbedb fwd=\\"216.49.181.254, 204.9.225.2\\" dyno=web.1 connect=2ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312303408478707720,"received_at":"2013-09-05T09:49:17-06:00"},{"display_received_at":"Sep 05 09:49:28","source_ip":"23.20.69.180","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=082fa2b9d544aa5d73e1d9e4c9971df2 fwd=\\"216.49.181.254, 204.9.225.2\\" dyno=web.3 connect=0ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312303452971905044,"received_at":"2013-09-05T09:49:28-06:00"},{"display_received_at":"Sep 05 09:54:01","source_ip":"54.226.118.174","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.comrequest_id=d8e8e7c8852a3feb01d10c0d0aafb3fe fwd=\\"216.49.181.254, 204.9.225.3\\" dyno=web.2 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312304600135061514,"received_at":"2013-09-05T09:54:01-06:00"},{"display_received_at":"Sep 05 09:57:08","source_ip":"54.234.84.91","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=75c6fffd535c84c5b8ebfd3ae0f5b392 fwd=\\"216.49.181.253, 204.9.225.3\\" dyno=web.3 connect=3ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312305384344059911,"received_at":"2013-09-05T09:57:08-06:00"},{"display_received_at":"Sep 05 10:03:56","source_ip":"107.21.143.222","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=5d1cdad6311f888eb6b1c28f9cffcded fwd=\\"216.49.181.254, 204.9.225.3\\" dyno=web.2 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312307097427836931,"received_at":"2013-09-05T10:03:56-06:00"},{"display_received_at":"Sep 05 10:16:26","source_ip":"54.221.2.197","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=d35bc09f27c00e72cd357b6405131658 fwd=\\"10.34.20.130, 204.9.225.10\\" dyno=web.3 connect=5ms service=30010ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312310242354724882,"received_at":"2013-09-05T10:16:26-06:00"},{"display_received_at":"Sep 05 10:20:42","source_ip":"54.234.6.80","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=52f222d85a2b09742fd79c195d70a0a2 fwd=\\"216.49.181.254, 204.9.225.3\\" dyno=web.2 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312311315643523088,"received_at":"2013-09-05T10:20:42-06:00"},{"display_received_at":"Sep 05 10:21:20","source_ip":"107.21.85.199","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=5af1c32e9f785270c0c51faf9c0deb5f fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.2 connect=5ms service=30002ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312311475840811014,"received_at":"2013-09-05T10:21:20-06:00"},{"display_received_at":"Sep 05 10:23:38","source_ip":"184.72.197.114","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=e0c39d1d135350f3a13e9bc83479e511 fwd=\\"71.195.180.175, 204.9.225.10\\" dyno=web.1 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312312055090950152,"received_at":"2013-09-05T10:23:38-06:00"},{"display_received_at":"Sep 05 10:24:00","source_ip":"54.234.6.80","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=909890732406918164bf98f64e1d76de fwd=\\"108.222.138.93, 204.9.225.3\\" dyno=web.1 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312312143494275094,"received_at":"2013-09-05T10:24:00-06:00"},{"display_received_at":"Sep 05 10:24:39","source_ip":"107.21.143.222","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=ceec9e83ee24ab5d53ce49f8ffdf9e76 fwd=\\"216.49.181.254, 204.9.225.3\\" dyno=web.2 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312312309764915207,"received_at":"2013-09-05T10:24:39-06:00"},{"display_received_at":"Sep 05 10:47:16","source_ip":"54.234.75.168","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=005de2c8a650428c26447be7679185e1 fwd=\\"216.49.181.253, 204.9.225.3\\" dyno=web.1 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312318001494122514,"received_at":"2013-09-05T10:47:16-06:00"},{"display_received_at":"Sep 05 10:49:26","source_ip":"54.221.29.208","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=28f205c71c0cb39e32265995008c1370 fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.2 connect=1ms service=30006ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312318546241978369,"received_at":"2013-09-05T10:49:26-06:00"},{"display_received_at":"Sep 05 10:51:12","source_ip":"54.224.248.17","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=d7cdfe31e8fe23ccdcb82d5f45487fe0 fwd=\\"10.34.20.130, 204.9.225.3\\" dyno=web.1 connect=1ms service=30025ms status=503 bytes=0","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312318991794503682,"received_at":"2013-09-05T10:51:12-06:00"},{"display_received_at":"Sep 05 10:54:05","source_ip":"54.225.13.217","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/ host=fs-identity-prod.herokuapp.com request_id=5e90dafa174cad0f20fe7d5d6f1c5b88 fwd=\\"10.34.20.130, 204.9.225.2\\" dyno=web.3 connect=3ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312319715509075969,"received_at":"2013-09-05T10:54:05-06:00"},{"display_received_at":"Sep 05 10:56:16","source_ip":"54.234.84.91","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=28445dae5c8f00431fb073424b288d13 fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.1 connect=2ms service=30008ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312320265495597056,"received_at":"2013-09-05T10:56:16-06:00"},{"display_received_at":"Sep 05 10:58:58","source_ip":"23.20.79.72","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=551494ea931c592458063488984ebdd6 fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.1 connect=2ms service=30007ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312320946294050821,"received_at":"2013-09-05T10:58:58-06:00"},{"display_received_at":"Sep 05 11:11:54","source_ip":"174.129.60.172","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=42a4ef1069dee6a46fa607448cfa506c fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.3 connect=2ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312324199589150720,"received_at":"2013-09-05T11:11:54-06:00"},{"display_received_at":"Sep 05 11:13:05","source_ip":"23.20.79.72","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=970fc395aa87252dcfd54330f9a43796 fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.3 connect=3ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312324498588520456,"received_at":"2013-09-05T11:13:05-06:00"},{"display_received_at":"Sep 05 11:23:15","source_ip":"107.21.143.222","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=d57f2827ebddda6f70d6d5d25a6b145a fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.3 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312327057726308353,"received_at":"2013-09-05T11:23:15-06:00"},{"display_received_at":"Sep 05 11:24:28","source_ip":"23.20.69.180","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=70749cb17057e479633f0c6991dbd3b7 fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.2 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312327362874527759,"received_at":"2013-09-05T11:24:28-06:00"},{"display_received_at":"Sep 05 11:28:08","source_ip":"54.234.6.80","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=53a4cb4b29e59099c4987f910773c17a fwd=\\"216.49.181.128, 204.9.225.3\\" dyno=web.1 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312328284946063390,"received_at":"2013-09-05T11:28:08-06:00"},{"display_received_at":"Sep 05 11:30:05","source_ip":"50.16.251.18","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=57c6eb7205985e30280b72ea246086bb fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.2 connect=3ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312328777059618827,"received_at":"2013-09-05T11:30:05-06:00"},{"display_received_at":"Sep 05 11:31:34","source_ip":"23.20.79.72","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=0b7cb26a0e2659cd8e84ebcd12c6a8bc fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.3 connect=3ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312329148360380428,"received_at":"2013-09-05T11:31:34-06:00"},{"display_received_at":"Sep 05 11:34:56","source_ip":"54.242.166.214","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=dcb71dcdedbd477f0c0fa050205e2f55 fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.1 connect=12ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312329996792582145,"received_at":"2013-09-05T11:34:56-06:00"},{"display_received_at":"Sep 05 11:36:33","source_ip":"184.72.158.45","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=21caa7dc1708e6a1ee58a9271976093e fwd=\\"216.49.181.128, 204.9.225.3\\" dyno=web.3 connect=1ms service=30002ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312330403900055554,"received_at":"2013-09-05T11:36:33-06:00"},{"display_received_at":"Sep 05 11:47:28","source_ip":"50.16.251.18","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=b8b7fc66fe0fa9ddaef33fc2a49a4c8c fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.1 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312333152515608582,"received_at":"2013-09-05T11:47:28-06:00"},{"display_received_at":"Sep 05 11:50:51","source_ip":"54.234.6.80","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=8cd5deab6e43edc8cfcd571b183c67fc fwd=\\"216.49.181.254, 204.9.225.10\\" dyno=web.2 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312334003413999619,"received_at":"2013-09-05T11:50:51-06:00"},{"display_received_at":"Sep 05 11:51:00","source_ip":"54.225.36.107","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=cc72140e71484d5905c79b86da0e5447 fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.1 connect=42ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312334039321436166,"received_at":"2013-09-05T11:51:00-06:00"},{"display_received_at":"Sep 05 11:55:54","source_ip":"23.20.79.72","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processFullname host=fs-identity-prod.herokuapp.com request_id=bb7719b09c148533a24afa585ea0d253 fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.3 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312335271310217228,"received_at":"2013-09-05T11:55:54-06:00"},{"display_received_at":"Sep 05 11:56:27","source_ip":"184.72.158.45","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=b119d7b0eee9c537f87c26007370edee fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.2 connect=1ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312335412926636050,"received_at":"2013-09-05T11:56:27-06:00"},{"display_received_at":"Sep 05 11:57:40","source_ip":"184.72.197.114","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=9146af4f46e9695d01adf71e33a9b0de fwd=\\"216.49.181.128, 204.9.225.10\\" dyno=web.1 connect=4ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312335718473314310,"received_at":"2013-09-05T11:57:40-06:00"},{"display_received_at":"Sep 05 12:01:58","source_ip":"54.224.248.17","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=POST path=/processUsername host=fs-identity-prod.herokuapp.com request_id=ce49aef869b0aa47c27b0f35fbb314cf fwd=\\"216.49.181.128, 204.9.225.2\\" dyno=web.2 connect=2ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312336801249689601,"received_at":"2013-09-05T12:01:58-06:00"},{"display_received_at":"Sep 05 15:11:19","source_ip":"54.242.189.155","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=07137fa99f7c26339d705910ec831a24 fwd=\\"71.181.28.71, 204.9.225.10\\" dyno=web.3 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312384449814003712,"received_at":"2013-09-05T15:11:19-06:00"},{"display_received_at":"Sep 05 15:12:26","source_ip":"184.72.197.114","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=b8e3a2b79853653d0ee72de8af2e3aad fwd=\\"76.204.212.225, 204.9.225.3\\" dyno=web.1 connect=2ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312384733810307077,"received_at":"2013-09-05T15:12:26-06:00"},{"display_received_at":"Sep 05 15:12:37","source_ip":"54.225.36.107","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=0a07a722a7bb64135ff86574d6810835 fwd=\\"167.164.3.140, 204.9.225.10\\" dyno=web.3 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312384776692912149,"received_at":"2013-09-05T15:12:37-06:00"},{"display_received_at":"Sep 05 15:13:12","source_ip":"23.20.79.72","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=03262aec7698e212711fda4e79f68060 fwd=\\"68.54.220.219, 204.9.225.2\\" dyno=web.3 connect=1ms service=30000ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312384926316318736,"received_at":"2013-09-05T15:13:12-06:00"},{"display_received_at":"Sep 05 15:16:15","source_ip":"50.16.251.18","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=a7f6bfa7d7f4362626b093fef94d6a44 fwd=\\"67.161.254.129, 204.9.225.3\\" dyno=web.3 connect=1ms service=30003ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312385692376522777,"received_at":"2013-09-05T15:16:15-06:00"},{"display_received_at":"Sep 05 15:19:06","source_ip":"54.221.10.40","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=e9e0560559b1a696579a719e3a8c9b15 fwd=\\"121.72.173.204, 204.9.225.2\\" dyno=web.3 connect=2ms service=30001ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312386411330600962,"received_at":"2013-09-05T15:19:06-06:00"},{"display_received_at":"Sep 05 15:22:42","source_ip":"107.20.120.47","facility":"Local3","source_name":"fs-identity-prod","message":"at=error code=H12 desc=\\"Request timeout\\" method=GET path=/ host=fs-identity-prod.herokuapp.com request_id=20877edbf4042526f9891f488b22f4df fwd=\\"174.74.51.246, 204.9.225.3\\" dyno=web.2 connect=2ms service=30002ms status=503 bytes=0 ","source_id":8418802,"severity":"Info","hostname":"fs-identity-prod","program":"heroku/router","id":312387317035982856,"received_at":"2013-09-05T15:22:42-06:00"}]}' }
 */

