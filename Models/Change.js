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
  , debug = require('debug')('marrow:models:change');

/**
 * Local Dependencies
 */
var utils = require('../lib/utils');
/**
 * Local Declarations
 */
var restart = utils.restartApp
  , notify = utils.sendNotification
  , Change;

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
 * Pre Save Notifications Handler
 */
ChangeSchema.pre('save', function(next) {
  // Only send notifications for marrow things
  if (this.type !== 'marrow') return next();
  // So far, I only care about restarts and status changes
  if (['restart', 'status.change'].indexOf(this.action) === -1) return next();

  var item = this;

  // If this.type isn't one of these, we're moving along.
  var notifyHandlers = {

    restart : function() {
      var date = new Date()
        , then = date.setMinutes(date.getMinutes() - 20);

      Change.count({
        name : item.name,
        action : item.action,
        created_at : { $gte : then }
      }, function(err, count) {
        // If the count fails for some reason, we'd rather do all of the actions than none
        if (err) count = 0;
        var newErr;

        var msgTypes = {
            0 : 'restart',
            2 : 'restarts'
          };

        return sendNotify(msgTypes[count]);
      });
    },

    'status.change' : function() {
      var msgTypes = {
          'to "down"': 'toDown',
          'to "slow"': 'toSlow',
          'to "good"': 'toGood'
        };

      return sendNotify(msgTypes[item.meta.reason.match(/to "\w+"/)]);
    }
  }

  // If this isn't "restart" || "status.change", I don't care
  return (notifyHandlers[this.action] || next)();

  function sendNotify(msgType) {
    if (! msgType) return next();

    notify(item.name, msgType, item.meta.reason)
      // On success or failure of notification we want to save our data
      .then(done, done);
  }
  function done() {
    next();
  }
});

/**
 * Restarts the Heroku app if heroku information is set
 *
 * If there have been 0 restart attempts in the last 15 minutes, we restart and trigger a single restart alert
 * If there has been 1 restart attempt in the last 15 minutes, we do nothing (It could just be an echo from the first)
 * If there have been 2 restart attempts in the last 15 minutes, we trigger a multiple restarts alert (Definitely not an echo)
 * Over 2, we do nothing (too much noise)
 *
 * @param  {String} app_name Name of the Heroku app
 * @return null
 */
ChangeSchema.statics.restartHerokuApp = function(app_name, reason) {
  if (! app_name) return Q.reject(new Error('No Marrow app_name supplied'));
  if (! reason) return Q.reject(new Error('No restart reason supplied'));

  var dfd = Q.defer()
    , currPromise
    , date = new Date()
    , then = date.setMinutes(date.getMinutes() - 20);

  Change.count({
    name : app_name,
    action: 'restart',
    created_at : { $gte : then }
  }, function(err, count) {
    var err;
    // If this fails for some reason, we'd rather do the actions than not
    if (err) count = 0;


    restart(app_name, reason)
      .then(function success() {
        return successHandler('restart');
      }, function failure(err) {
        if (err.name === 'notConfigured') return successHandler('restart.not_configured');
        return dfd.reject(err);
      });

    function successHandler(action) {

      var change = Change.fromMarrow(app_name, action, reason);
      change.save(function(err, doc) {
        if (err) return dfd.reject(err);
        dfd.resolve(doc);
      });
    }
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

  var config = {
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

  var config = {
      _raw : data,
      type : 'jenkins',
      action: action || 'build',
      name : data.name
    };

  config.repo_name = getRepoName(data.name);

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

  var config = {
      type : 'marrow',
      action : action || 'restart',
      name : app_name
    };

  if (reason) {
    config.meta = { reason : reason };
  }

  config.repo_name = getRepoName(app_name);

  debug('FromMarrow: ', config);

  return new Change(config);
};

/**
 * Report a change from an ElectricCommander build (or other action)
 *
 * @param  {Object} data   req.body
 * @param  {String} action (build) The action taken that should be logged
 * @return {Change}        Instance of ChangeSchema (not saved)
 */
ChangeSchema.statics.fromEC = function(data, action) {
  if (! data) return new Error('No EC data supplied');

  var config = {
      _raw : data,
      name: data.name,
      type : 'electricCommander',
      action: action || 'build',
      meta : {
        url : data.build.url,
        git_commit : data.build.git_commit,
      },
    };

  config.repo_name = data.name.replace('frontier-', '');

  debug('FromEC: ', config);

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
ChangeSchema.statics.mockNotify = function(fn) {
  notify = fn;
};
ChangeSchema.statics.mock = function(restartFn, notifyFn) {
  var genericFn = function() {
    var args = [];
    Array.prototype.pop.apply(args, arguments);

    var cb = args.pop();
    if (typeof cb === 'function') cb();
    return Q.resolve();
  };
  if (! restartFn) restartFn = genericFn;
  if (! notifyFn) notifyFn = genericFn;

  restart = restartFn;
  notify = notifyFn;
};

/**
 * Used for Testing. Allows us to undo our mocking.
 */
ChangeSchema.statics.restore = function() {
  restart = utils.restartApp;
  notify = utils.sendNotification;
};

module.exports = Change = mongoose.model('Change', ChangeSchema);

function getRepoName(appName) {
  var repoName = appName
    .replace('fs-', '')
    .replace('-test', '')
    .replace('-prod', '');

  return repoName;
}
