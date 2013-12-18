/**
 * Models/Service_Map.js
 *
 * This Mongoose Model is for App-to-Service mapping.
 *
 * Each instance should have a unique app name (repo_name), and an
 * Array of all of the Services (APIs) that the given app is telling
 * us that it requires.
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:service_map');


/**
 * Local Declarations
 */
var MapModel;

/**
 * Service Map Schema
 * @type {Schema}
 */
var MapSchema = new Schema({
    created_at : { type: Date, default: Date.now },
    repo_name : String,
    services : [String]
  });

/**
 * Parses the Splunk data into individual Apps and saves.
 *
 * @param  {Object}  data Splunk res.body.data
 * @return {Promise}      Q promise object. Resolves on save of all apps
 */
MapSchema.statics.fromSplunk = function(data) {
  var dfd = Q.defer()
    , appsObj = {}
    , appDocs = []
    , dfds = []
    , config, i, _app, repo_name;

  if (! data) {
    dfd.reject(new Error('No Splunk data supplied'));
    return dfd.promise;
  }

  for (i=data.length; i--;) {
    _app = data[i];
    if (! _app.fs_host) continue;
    repo_name = _app.fs_host.replace('fs-','').replace('-prod','');
    if (! appsObj[repo_name]) {
      config = {
        repo_name : repo_name,
        services : []
      };
      appsObj[repo_name] = config;
      appDocs.push(config);
    }
    if (appsObj[repo_name].services.indexOf(_app.api) === -1) {
      appsObj[repo_name].services.push(_app.api);
    }
  }

  for (i=appDocs.length; i--;) {
    // Pushes dfd onto dfds
    addServices(appDocs[i], dfds);
  }

  Q.all(dfds).then(dfd.resolve, dfd.reject);

  return dfd.promise;
};

/**
 * Adds the services for a given app
 * @param {Object} appData Normalized data for the given app's dependencies
 * @param {Array}  dfds    Array of deferred objects to add its to
 */
function addServices(appData, dfds) {
  var dfd = Q.defer()
    , repo_name = appData.repo_name
    , services = appData.services;
  dfds.push(dfd.promise);

  MapModel.findOne({ repo_name : repo_name }, function(err, doc) {
    if (err) return dfd.reject(err);
    var i, _service, found = [];

    if (! doc) {
      doc = new MapModel(appData);
      return doc.save(function(err, doc) {
        if (err) return dfd.reject(err);
        dfd.resolve(doc);
      });
    }

    // Filter out all of the services already listed
    services = services.filter(function(el) {
      return doc.services.indexOf(el) === -1;
    });

    MapModel.findByIdAndUpdate(doc._id, {
      services : {
        $pushAll : services
      }
    }, {
      "new" : true
    }, function(err, doc) {
      if (err) return dfd.reject(err);
      return dfd.resolve(doc);
    });
  });
}

MapModel = module.exports = mongoose.model('Map', MapSchema);
