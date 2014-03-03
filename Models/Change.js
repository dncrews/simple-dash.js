/**
 * Models/Change.js
 *
 * This Mongoose Model is for the Change Log.
 *
 * Changes should be posted and saved on occurence. These changes include -- but
 * are not limited to -- successful builds, change of status from up to down or vice versa,
 * immune system restarts.
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , HerokuAPI = require('heroku.js')
  , debug = require('debug')('marrow:models:change')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

/**
 * Local Declarations
 */
var heroku, restart;

/**
 * Changelog Schema Declaration
 * @type {Schema}
 */
var ChangeSchema = new Schema({
  created_at : { type: Date, default: Date.now, expires: 604800 },
  type : String,
  action : String,
  name : String, // org/repo
  repo_name : String,
  meta : Schema.Types.Mixed,
  _raw : Schema.Types.Mixed
});

/**
 * Api Configurations
 */
if (! sendgrid.api_user) {
  // If sendgrid isn't configured, don't try to send emails
  sendgrid = undefined;
}

try {
  heroku = new HerokuAPI({"email" : process.env.HEROKU_EMAIL, "apiToken" : process.env.HEROKU_API_TOKEN});
} catch (e) {
  debug('HerokuAPI not configured'); // No penalty if Heroku configuration isn't defined
}

/**
 * Restarts the Heroku app if heroku information is set
 *
 * @param  {String} app_name Name of the Heroku app
 * @return null
 */
ChangeSchema.statics.restartHerokuApp = function(app_name, reason) {
  if (! app_name) return Q.reject(new Error('No Marrow app_name supplied'));
  if (! reason) return Q.reject(new Error('No restart reason supplied'));

  var dfd = Q.defer()
    , Change = this;

  restart(app_name, reason, function(restarted) {
    var change;
    if (restarted instanceof Error) return dfd.reject(restarted);

    if (typeof restarted !== 'boolean') {
      dfd.reject();
      throw new Error('Restart returned unknown value', restarted);
    }

    if (restarted) {
      // App successfully restarted
      change = Change.fromMarrow(app_name, 'restart', reason);
    } else {
      // App would've restarted, but wasn't configured
      change = Change.fromMarrow(app_name, 'restart.not_configured', reason);
    }
    return change.save(function(err, doc) {
      if (err) return dfd.reject(err);
      dfd.resolve(doc);
    });
  });

  return dfd.promise;
};

/**
 * Report a change from a Github Merge into Master (or other action)
 *
 * @param  {Object} data   req.body.payload
 * @param  {String} action (merge) The action taken that should be logged
 * @return {Change}        Instance of ChangeSchema (not saved)
 */
ChangeSchema.statics.fromGithub = function(data, action) {
  if (! data) return new Error('No Github data supplied');

  var Change = this
    , config = {
      _raw : data,
      type : 'github',
      action : action || 'merge',
      name : data.repository.organization + '/' + data.repository.name,
      repo_name : data.repository.name,
      meta : {
        message : data.head_commit.message,
        url : data.head_commit.url,
        author : data.head_commit.author
      }
    };
  debug('FromGithub: ', config);
  return new Change(config);
};

/**
 * Report a change from a Jenkins build (or other action)
 *
 * @param  {Object} data   req.body
 * @param  {String} action (build) The action taken that should be logged
 * @return {Change}        Instance of ChangeSchema (not saved)
 */
ChangeSchema.statics.fromJenkins = function(data, action) {
  if (! data) return new Error('No Jenkins data supplied');

  var Change = this
    , config = {
      _raw : data,
      type : 'jenkins',
      action: action || 'build',
      name : data.name
    };

  config.repo_name = data.name.replace('fs-', '').replace('-prod', '').replace('-test','');

  debug('FromJenkins: ', config);

  return new Change(config);
};

/**
 * Report a change of a Marrow restart (or other action)
 *
 * @param  {String} app_name Heroku App name that had action performed
 * @param  {String} action   (restart) The action taken that should be logged
 * @param  {String} reason   The reason the action was performed
 * @return {Change}          Instance of ChangeSchema (not saved)
 */
ChangeSchema.statics.fromMarrow = function(app_name, action, reason) {
  if (! app_name) return new Error('No Marrow app_name supplied');

  var Change = this
    , config = {
      type : 'marrow',
      action : action || 'restart',
      name : app_name
    };

  if (reason) {
    config.meta = { reason : reason };
  }

  config.repo_name = app_name
    .replace('fs-','')
    .replace('-prod','');

  debug('FromMarrow: ', config);

  return new Change(config);
};

/**
 * Used for Testing. Allows us to mock restart to prevent testing
 * Heroku functionality
 *
 * @param  {Function} fn Function to be used instead of actual heroku restarting
 */
ChangeSchema.statics.mockRestart = function(fn) {
  restart = fn;
};

/**
 * Used for Testing. Allows us to undo our mocking.
 */
ChangeSchema.statics.restore = function() {
  restart = doRestart;
};

restart = doRestart;

/**
 * Perform restart of Heroku Application
 *
 * Returns information, so requires cb instead of returning a promise
 * Return of `true`: Heroku app was restarted
 * Return of `false`: Heroku credentials are not configured
 * Return of `Error`: Heroku app was not able to restart
 *
 * @param  {String}   app_name Name of the Heroku app to restart
 * @param  {String}   reason   The reason for restarting the Heroku app
 * @param  {Function} cb       Function to be perfored on completion
 * @return {Boolean}
 */
function doRestart(app_name, reason, cb) {
  if (! app_name) {
    return cb && cb(new Error('No Marrow app_name supplied'));
  }

  if (! heroku) {
    console.error('Restart Requested; Heroku not configured. Cause: ' + reason);
    return cb(false);
  }

  heroku.restart(app_name, restartHandler);

  function restartHandler(err, resp) {
    if (err) {
      console.error(err);
      return cb(err);
    }

    if (! sendgrid) {
      console.error('Restart occurred. Sendgrid not configured. Cause: ' + reason);
      return cb(true);
    }

    sendgrid.send({
      to: process.env.RESTART_EMAIL_TO,
      from: process.env.RESTART_EMAIL_FROM,
      subject: 'Automatic app restart',
      text: 'The Heroku app "' + app_name + '" has been automatically restarted. Be advised. Cause: ' + reason
    }, function(err, json) {
      if (err) {
        console.error('Restart occurred. Sendgrid error', err);
      }
      return cb(true);
    });
  }
}

module.exports = mongoose.model('Change', ChangeSchema);
