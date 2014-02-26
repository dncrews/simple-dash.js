/**
 * lib/logger.js
 *
 * Handles the logging of all App and Service (API) statuses
 */

/**
 * Module Dependencies
 */
var Q = require('q')
  , debug = require('debug')('marrow:logger');

/**
 * Local Dependencies
 */
var App_Bucket = require('../Models/App_Bucket')
  , App_Error = require('../Models/App_Error')
  , App_Status = require('../Models/App_Status')
  , Change = require('../Models/Change')
  , Service = require('../Models/Service')
  , Service_Map = require('../Models/Service_Map')
  , Upstream = require('../Models/Upstream')
  , Performance = require('../Models/Performance');

/**
 * This is the Primary Logger.
 *
 * Will use the req.body.alert_title to determine which type
 * of logging to use. Will convert to Mongoose Models and save
 * as needed.
 *
 * @param {Object} content req.body. Requires `alert_title` property
 */
function Logger(content) {
  this.title = content.alert_title.replace(/\./g, ':');
  this.dfds = [];

  // Sometimes the req.body.data needs a little extra massaging
  if (typeof content.data === 'string') {
    try {
      content.data = JSON.parse(content.data);
    } catch (e) {
      console.warn(e);
      this.parseFailed = true;
      return this;
    }
  }

  this.content = content;
  this.data = content.data;
  return this;
}

Logger.prototype.log = function log(next) {
  if (this.parseFailed === true) {
    return next(500);
  }
  var title = this.title;

  if (typeof this[title] === 'undefined') {
    // Anything else invokes "stranger danger"
    console.warn("I NEED AN ADULT!!!");
    console.info(this.content);
    return next(400);
  }

  this[title]();

  // After all the simultaneous stores, send back "created"
  Q.all(this.dfds).then(function() {
    next(201);
  }, function failure () {
    console.error(arguments);
    next(500);
  });
};

Logger.prototype['perf:dashboard:frontier:page_ready_by_app'] = function pageReadyByAppLogger() {
  this.dfds.push(Performance.fromSplunkPageReady(this.data));
};

Logger.prototype['status:dashboard:frontier:mem_response'] = function appLogger() {
  var i, l, data = this.data;

  for (i=0, l=data.length; i<l; i++) {
    this.dfds.push(App_Status.fromSplunk(data[i]));
  }
};

Logger.prototype['status:dashboard:frontier:api:flat_response_data'] = function serviceLogger() {
  var i, l, data = this.data;
  for (i=0, l=data.length; i<l; i++) {
    this.dfds.push(Service.fromSplunk(data[i]));
  }
};

Logger.prototype['status:dashboard:frontier:heroku_errors'] = function herokuErrorLogger() {
  this.dfds.push(App_Error.fromSplunk(this.data));
};

Logger.prototype['status:dashboard:frontier:app_to_api_map'] =   function mapLogger() {
  this.dfds.push(Service_Map.fromSplunk(this.data));
};

Logger.prototype['status:dashboard:frontier:ha_proxy_status_codes'] =   function haProxyLogger() {
  // Update Heroku whenever we update HA Proxy
  // FIXME: does this belong here?
  this.dfds.push(Upstream.fetchHeroku());
  this.dfds.push(Upstream.haFromSplunk(this.data[0]));
};

module.exports = Logger;
