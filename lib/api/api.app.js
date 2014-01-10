/**
 * Module Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:app');

/**
 * Local Dependencies
 */
var App_Bucket = require('../../Models/App_Bucket');

/**
 * Local Vars
 */
var app = module.exports = express();

app.get('/', function (req, res) {
  App_Bucket.findCurrent(function(err, docs) {
    if (err) {
      debug('Index docs failure: ', err);
      return res.send(500, err);
    }
    debug('Index docs retrieved: ' + docs.length);
    return res.send(200, docs);
  });
});

app.get('/:app_name', function (req, res) {
  var date = new Date()
    , now = Date.now()
    , then = date.setDate(date.getDate() - 2);
  App_Bucket
    // .find({
    //   name : req.params.app_name
    // })
    .find({
      // FIXME: We want to get all emtpies that are older than 5 minutes ago
      $and : [
        {
          $or : [
            { repo_name : req.params.app_name },
            { name : req.params.app_name }
          ]
        },
        {
          $or : [
            { app : { $ne : null } },
            { app_errors : { $ne : null } },
          ]
        }
      ],
      // $or : [
      //   { repo_name : req.params.app_name },
      //   { name : req.params.app_name }
      // ],
      bucket_time : {
        $lte : now,
        // $gte : then
      }
    })
    .sort({
      bucket_time : -1
    })
    .populate('app app_errors')
    .exec(function(err, docs) {
      if (err) {
        debug('App history failure: ', err);
        return res.send(500, err);
      }
      res.send(200, docs);
    });
});
