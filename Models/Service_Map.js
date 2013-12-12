var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:service_map');


var MapModel
  , MapSchema = new Schema({
    created_at : { type: Date, default: Date.now },
    repo_name : String,
    services : [String]
  });


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
