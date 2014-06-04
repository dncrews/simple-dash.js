
/**
 * Module Dependencies
 */
var Q = require('q')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD)
  , HerokuAPI = require('heroku.js')
  , debug = require('debug')('marrow:utils');


/**
 * Local Declarations
 */
var heroku, getRestart;

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

      sendgrid.send({
        to: process.env.RESTART_EMAIL_TO,
        from: process.env.RESTART_EMAIL_FROM,
        subject: 'Automatic app restart',
        text: 'The Heroku app "' + appName + '" has been automatically restarted. Be advised. Cause: ' + reason
      }, function(err, json) {
        // There was a restart, but the email failed
        if (err) {
          debug('Restart occurred. Sendgrid error: ', err);
        }
        if (cb) cb();
        return dfd.resolve();
      });
    });

    return dfd.promise;
  };

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
