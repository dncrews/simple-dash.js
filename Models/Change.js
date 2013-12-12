/* globals require,module,console,process */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , HerokuAPI = require('heroku.js')
  , debug = require('debug')('marrow:models:change')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

// If sendgrid isn't configured, don't try to send emails
if (! sendgrid.api_user) {
  sendgrid = undefined;
}

var heroku, restart, _restart;

try {
  heroku = new HerokuAPI({"email" : process.env.HEROKU_EMAIL, "apiToken" : process.env.HEROKU_API_TOKEN});
} catch (e) {
  debug('HerokuAPI not configured'); // No penalty if Heroku configuration isn't defined
}

var ChangeSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  type : String,
  action : String,
  name : String, // org/repo
  repo_name : String,
  meta : Schema.Types.Mixed,
  _raw : Schema.Types.Mixed
});

/**
 * Restarts the Heroku app if heroku information is set
 *
 * @param  {String} app_name Name of the Heroku app
 * @return null
 */
ChangeSchema.statics.restartHerokuApp = function(app_name, reason) {
  var dfd = Q.defer()
    , Change = this;

  if (app_name && reason) {
    restart(app_name, function(restarted) {
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
  }

  if (! app_name) {
    dfd.reject(new Error('No Marrow app_name supplied'));
  }
  if (! reason) {
    dfd.reject(new Error('No restart reason supplied'));
  }

  return dfd.promise;
};

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
  return new Change(config);
};

ChangeSchema.statics.fromJenkins = function(data, action) {
  if (! data) return new Error('No Jenkins data supplied');

  var Change = this
    , config = {
      _raw : data,
      type : 'jenkins',
      action: action || 'build',
      name : data.app_name
    };

  config.repo_name = data.app_name.replace('fs-', '');

  return new Change(config);
};

ChangeSchema.statics.fromMarrow = function(app_name, action, reason) {
  if (! app_name) return new Error('No Marrow app_name supplied');

  var Change = this
    , config = {
      type : 'marrow',
      action : action || 'restart',
      meta : { reason : reason },
      name : app_name
    };

  config.repo_name = app_name
    .replace('fs-','')
    .replace('-prod','');

  return new Change(config);
};

ChangeSchema.statics.mockRestart = function(fn) {
  restart = fn;
};

ChangeSchema.statics.restore = function() {
  restart = doRestart;
};

restart = doRestart;

function doRestart(app_name, cb) {
  if (! app_name) {
    return cb && cb(new Error('No Marrow app_name supplied'));
  }

  if (! heroku) {
    console.error('Restart Requested; Heroku not configured');
    return cb(false);
  }

  heroku.restart(app_name, restartHandler);

  function restartHandler(err, resp) {
    if (err) {
      console.error(err);
      return cb(err);
    }

    if (! sendgrid) {
      console.error('Restart occurred. Sendgrid not configured');
      return cb(true);
    }

    sendgrid.send({
      to: process.env.RESTART_EMAIL_TO,
      from: process.env.RESTART_EMAIL_FROM,
      subject: 'Automatic app restart',
      text: 'The Heroku app "' + app_name + '" has been automatically restarted. Be advised.'
    }, function(err, json) {
      if (err) {
        console.error('Restart occurred. Sendgrid error', err);
      }
      return cb(true);
    });
  }
}

module.exports = mongoose.model('Change', ChangeSchema);
