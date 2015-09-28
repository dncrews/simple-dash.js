/**
 * Module Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:service');

/**
 * Local Dependencies
 */
var Service = require('../../Models/Service');

/**
 * Local Declarations
 */
var app = module.exports = express();

app.get('/', function (req, res) {
  Service.findCurrent(function(err, docs) {
    if (err) {
      debug('Index docs failure: ', err);
      return res.status(500).send(err);
    }
    debug('Index docs retrieved: ' + docs.length);
    return res.status(200).send(docs);
  });
});

app.get('/:service_name', function (req, res) {
  var date = new Date()
    , days = req.query.days || 7
    , then = date.setDate(date.getDate() - days);
  Service
    .find({
      name : req.params.service_name,
      created_at : {
        $gte : then
      }
    })
    .sort({
      created_at : -1
    })
    .exec(function(err, docs) {
      if (err) {
        debug('Service history failure: ', err);
        return res.status(500).send(err);
      }
      res.status(200).send(docs);
    });
});

app.get('/app/:app_name', function (req, res) {
  var repo_name = req.params.app_name.replace('fs-', '').replace('-prod','');
  Service.findCurrentByRepo(repo_name, function(err, docs) {
    if (err) {
      debug('App Services status failure: ', err);
      return res.status(500).send(err);
    }
    res.status(200).send(docs);
  });
});
