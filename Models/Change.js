/* globals require,module,console */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('marrow:models:change');

var ChangeSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  type : String,
  action : String,
  name : String, // org/repo
  repo_name : String,
  meta : Schema.Types.Mixed,
  _raw : Schema.Types.Mixed
});

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

ChangeSchema.statics.fromMarrow = function(app_name, action) {
  if (! app_name) return new Error('No Marrow app_name supplied');

  var Change = this
    , config = {
      type : 'marrow',
      action : action || 'restart',
      name : app_name,
    };

  config.repo_name = app_name
    .replace('fs-','')
    .replace('-prod','');

  return new Change(config);
};

module.exports = mongoose.model('Change', ChangeSchema);
