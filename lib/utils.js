
/**
 * Module Dependencies
 */
var Q = require('q')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD)
  , HerokuAPI = require('heroku.js')
  , request = require('superagent')
  , debug = require('debug')('marrow:utils');


/**
 * Local Declarations
 */
var heroku, getRestart
  , xMattersUri = process.env.X_MATTERS_URI
  , xMattersUser = process.env.X_MATTERS_USER
  , xMattersPass = process.env.X_MATTERS_PASS;

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


exports.restartApp = restartApp;

/**
 * Perform restart of Heroku Application
 *
 * Returns a Q.promise but also accepts a callback.
 *
 * Returns (& rejects w/) err type of `notConfigured` if not configured properly
 * Returns (& rejects w/) Heroku lib err if app failed to restart
 * Returns (& resolves) no err if the Heroku app was successfully restarted
 *
 * @param  {String}   appName  Name of the Heroku app to restart
 * @param  {String}   reason   The reason for restarting the Heroku app
 * @param  {Function} cb       Callback function
 * @return {Promise}
 */
function restartApp(appName, reason, cb) {

  function reject(msg, name) {

    var newErr = new Error(msg);
    if (name) newErr.name = name;

    debug(msg);
    if (cb) cb(newErr);
    return Q.reject(newErr);
  }

  if (! appName) return reject('No marrow appName supplied', 'invalidRequest');
  if (! reason) return reject('No restart reason supplied', 'invalidRequest');
  if (! heroku) return reject('Restart Requested; Heroku not configured. Cause: ' + reason, 'notConfigured');

  // Bind the current params down the line
  var restart = getRestart(appName, reason, cb);

  return restart();
}


/**
 * Performs the restart and notifies the Administrators on success
 *
 * Returns a Q.promise but also accepts a callback
 *
 * @param  {String}   appName Name of the Heroku app to restart
 * @param  {String}   reason  Reason the Heroku app is restarting
 * @param  {Function} cb      Callback
 * @return {Promise}
 */
function _getRestart(appName, reason, cb) {

  return function doRestart() {
    var dfd = Q.defer();

    heroku.restart(appName, function restartHandler(err, resp) {
      if (err) {
        debug(err);
        if (cb) cb(err);
        return dfd.reject(err);
      }

      if (cb) cb();
      return dfd.resolve();
    });

    return dfd.promise;
  };

}

exports.sendNotification = sendNotification;

function sendNotification(appName, type, description, cb) {
  var dfd = Q.defer()
    , xEvents = {
      restart : 'Single Restart',
      restarts : 'Multiple Restarts',
      toDown : 'Status change to Down',
      toSlow : 'Status change to Slow',
      toGood : 'Status change to Good',
      toBlue : 'Status change to Blue',
      toRed : 'Status change to Red',
      toYellow : 'Status change to Yellow',
      toGreen : 'Status change to Green'
    }
    , xEvent = xEvents[type]
    , err;

  if (! xEvent) {
    err = new Error('type not found: ' + type);
    debug(err);
    if (cb) cb(err);
    return dfd.reject(err);
  }

  request
    .post(xMattersUri)
    .auth(xMattersUser, xMattersPass)
    .set('content-type', 'application/json')
    .send({
      properties: {
        'AppName' : appName,
        'Actions' : xEvent,
        'Description' : description
      }
    })
    .on('error', function(err) {
      debug('xMatters Notification error: ', err);
      if (cb) cb(err);
      return dfd.reject(err);
    })
    .end(function(res) {
      debug('xMatters Notification posted');
      if (cb) cb();
      return dfd.resolve();
    });

  return dfd.promise;
}


/**
 * From here until said otherwise is for testability
 */
getRestart = _getRestart;

/**
 * Function called to mock out the getRestart function (.before tests)
 *
 * @param {Function} restartFn Function used to validate restart action called
 */
exports.mockRestart = function mockRestart(restartFn) {
  getRestart = restartFn;
};

/**
 * Function called to set getRestart back to normal (.after tests);
 */
exports.restoreRestart = function restoreRestart() {
  getRestart = _getRestart;
};

var realHeroku = heroku;
exports.mockHeroku = function mockHeroku () {
  heroku = null;
};

exports.restoreHeroku = function restoreHeroku() {
  heroku = realHeroku;
};


/**
 * End Testability block
 */
