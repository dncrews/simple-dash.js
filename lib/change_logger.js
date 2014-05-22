/**
 * change_logger.js
 * Description:
 * Handles saving data for the change_log views (/change)
 *
 */

/**
 * Module Dependencies
 */
var debug = require('debug')('marrow:changelog')
  , Q = require('q');

/**
 * Local Dependencies
 */
var Change = require('../Models/Change');

/**
 * Parse the GitHub payload
 * @param  {Object} github Github changelog data
 * @return {Object}        Changelog data formatted nicely
 */
function handleGithub(github) {
  var repo_name, org, commit_timestamp, commit_hash, commit_msg, commit_url, author, change_data;

  debug("github PAYLOAD", github);

  //if the github push is agains a branch that is NOT master, exit.
  if (github.ref !== 'refs/heads/master') return;

  return Change.fromGithub(github);
}

//TODO: whitelist the IP address of the box you like... (VIA env varis)
//notifications plugin provides this
//notfication from jenkins on build success / failure & as well as start, and other phases
function handleJenkins(jenkins) {
  // var jenkins = {
  //   "name":"fs-reference",
  //   "url":"job/fs-reference/",
  //   "build":{
  //     "full_url":"http://54.221.235.240/job/fs-reference/314/",
  //     "number":314,
  //     "phase":"FINISHED",
  //     "status":"SUCCESS",
  //     "url":"job/fs-reference/314/"
  //   }
  // }

  //only LOG SUCCESS FOR NOW!!!
  //abort if not success OR phase != finished
  if (jenkins.build.phase !== "FINISHED" || jenkins.build.status !== "SUCCESS") return false;

  return Change.fromJenkins(jenkins);
}

/**
 * Validate the ElectricCommander
 * @param  {Object} ec  ElectricCommander changelog data
 * @return {Object}     Changelog data formatted nicely
 */
function handleEC(ec) {
  if (ec.build.status !== 'Success') return false;

  return Change.fromEC(ec);
}

//start the saving logic
// includes determining what kind of data it is...
// src - github | marrow |
function initSave(data, src) {
  var dfd = Q.defer()
    , dataProcessors = {
      "github": handleGithub,
      "jenkins": handleJenkins,
      "ec": handleEC,
    }
    , payload = data.payload || data
    , change; // if there's a payload obj (marrow, & github, but not jenkins)

  //if it's not an object, then try to parse it...
  if (typeof payload !== "object") {
    //verify payload is a valid JSON obj
    try {
      payload = JSON.parse(payload);
    } catch(e) {
      debug('JSON.parse of payload FAILED');
      return Q.reject('JSON.parse of payload FAILED');
    }
  }

  debug("payload", payload);
  debug("src", src);

  change = dataProcessors[src](payload);

  if (! (change && (typeof change === 'object') && change.save)) return Q.reject('Failed to meet requirements');

  change.save(function(err, doc) {
    if (err) return dfd.reject(err);
    dfd.resolve(doc);
  });

  return dfd.promise;
}


module.exports = initSave;
