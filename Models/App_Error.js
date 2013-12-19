/**
 * Models/App_Error.js
 *
 * This Mongoose Model is for App Errors.
 *
 * At the time of this writing, errors are rolled up in 5-minute
 * intervals from Splunk, and are Heroku errors thrown by the
 * individual apps during that 5-minute period.
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('marrow:models:app_error')
  , Q = require('q');

/**
 * Local Dependencies
 */
var Change = require('./Change');


/**
 * App_Error Schema
 * @type {Schema}
 */
var ErrorSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  name : String,
  repo_name : String,
  codes : Array
});

/**
 * Parses the Splunk data into individual Apps and saves.
 *
 * Also attaches each error status to an app bucket with Bucket.addErrors.
 * Should be called with the full array of all app errors, including duplicated
 * app names.
 *
 * @param  {Object}  data Splunk res.body.data
 * @return {Promise}      Q promise object. Resolves on save and addErrors
 */
ErrorSchema.statics.fromSplunk = function(data) {
  if (! data) return Q.reject(new Error('No Splunk data supplied'));

  var dfd = Q.defer()
    , AppBucket = require('./App_Bucket')
    , errorObj = {} // Obj used to prevent duplicate app names. Contains same as errorArr
    , errorArr = [] // Array used for this.create. Contains same as errorObj
    , i, _error, appName, config;

  for (i=data.length; i--;) {
    _error = data[i];
    appName = _error.fs_host;
    delete _error.fs_host; // Don't save the appName in the codes array

    if (! _error) continue;
    if (! appName) continue;
    if (! errorObj[appName]) {
      errorObj[appName] = {
        name : appName,
        codes : []
      };
      errorObj[appName].repo_name = appName
        .replace('fs-','')
        .replace('-prod','');
      errorArr.push(errorObj[appName]);
    }

    errorObj[appName].codes.push(_error);
  }

  if (! errorArr.length) return Q.reject(new Error('No apps with names provided'));

  errorArr.push(function(err, doc1, doc2, etc) {
    var dfds = []
      , i, l, _doc;
    // 1st argument is err; rest are documents
    if (err) {
      dfd.reject(err);
    }
    // Skip the first argument (err)
    for (i=1, l=arguments.length; i<l; i++) {
      _doc = arguments[i];
      dfds.push(AppBucket.addErrors(_doc.name, _doc._id));
    }

    Q.all(dfds).then(dfd.resolve);
  });

  this.create.apply(this, errorArr);

  return dfd.promise;
};

/**
 * Pre Save Restart check
 *
 * Before saving an Error set, we want to check for R14
 * errors so that we can restart apps when necessary
 */
ErrorSchema.pre('save', function(next) {
  var i,l,code;
  for (i=this.codes.length; i--; i<0) {
    code = this.codes[i];
    if (code.code === 'R14') {
      return Change.restartHerokuApp(this.name, code.desc).then(done);
    }
  }
  // This is to ensure that next is never called with arguments
  function done() {
    next();
  }
  next();
});

module.exports = mongoose.model('App_Error', ErrorSchema);
