/* globals require,module,console,process */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , HerokuAPI = require('heroku.js')
  , debug = require('debug')('marrow:models:change')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var heroku;

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
    , change;
  if (! app_name) {
    dfd.reject(new Error('No Marrow app_name supplied'));
    return dfd.promise;
  }
  if (! reason) {
    dfd.reject(new Error('No restart reason supplied'));
    return dfd.promise;
  }

  function finalize(doc, cb) {
    doc.save(function() {
      if (cb) cb();
      dfd.resolve(doc);
    });
    return dfd.promise;
  }

  // No penalty if Heroku configuration isn't defined
  if (! heroku) {
    change = this.fromMarrow(app_name, 'not_configured', reason);
    return finalize(change);
  }

  heroku.restart(app_name, function(err, resp) {

    if (err) return console.error(err);

    change = this.fromMarrow(app_name, 'restart', reason);
    return finalize(change, function() {
      sendgrid.send({
        to: process.env.RESTART_EMAIL_TO,
        from: process.env.RESTART_EMAIL_FROM,
        subject: 'Automatic app restart',
        text: 'The Heroku app "' + app_name + '" has been automatically restarted. Be advised.'
      }, function(err, json) {
        if (err) return console.error(err);
      });
    });

  });
  return dfd.promise;
};

ChangeSchema.statics.fromGithub = function(data, action) {
  if (! data) return new Error('No Github data supplied');

  var Change = this
    , config = {
      _raw : data,
      type : 'github',
      action : action || 'merge',
      name : data.repo_name + '/' + data.org_name,
      repo_name : data.repo_name,
      meta : {
        message : data.commit.message,
        url : data.commit.url,
        author : data.author.username
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

module.exports = mongoose.model('Change', ChangeSchema);
