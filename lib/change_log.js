/**
 * change_log.js
 * Description:
 * Handles saving and getting data for the change_log views (/change)
 *
 */

/**
 * TODO: write good test cases for all this... Should be easy with the current structure.
 */

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

/**
 * DEPS
 */
var debug = require('debug')('changelog')
  , Q = require('q');

/**
 * Local Vars
 */
var db = require('./db').change_log;

/**
 * Parse the GitHub payload
 * @param  {Object} github Github changelog data
 * @return {Object}        Changelog data formatted nicely
 */
function handleGithub(github) {
  var repo_name, commit_timestamp, commit_hash, commit_msg, commit_url, author, change_data;

  debug("github PAYLOAD", github);

  //if the github push is agains a branch that is NOT master, exit.
  if (github.ref !== 'refs/heads/master') return;

  //fetch all the github commit data
  debug("github.repository", github.repository);
  debug("github.repository.name", github.repository.name);
  repo_name = github.repository.name;

  commit_timestamp = github.head_commit.timestamp;
  //convert to unix timestamp so it sorts properly
  commit_timestamp = Date.parse(commit_timestamp) / 1000;

  commit_hash = github.head_commit.id;
  commit_msg = github.head_commit.message;
  commit_url = github.head_commit.url;

  author = github.head_commit.author;

  //log this data to the DB

  debug("all data in a row:", repo_name + " | " + commit_timestamp + " | " + commit_hash + " | " + commit_msg + " | " + commit_url + " | " + JSON.stringify(author));

  change_data = {
    timestamp: commit_timestamp,
    data: {
      repo_name: repo_name,
      commit: {
        timestamp: commit_timestamp,
        id: commit_hash,
        message: commit_msg,
        url: commit_url
      },
      author: author
    },
    type: "github push",
    src: "github" //TODO: pull this from the user agent
  };

  //return data obj
  return change_data;
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

  var change_data;

  //only LOG SUCCESS FOR NOW!!!
  //abort if not success OR phase != finished
  if (jenkins.build.phase !== "FINISHED" || jenkins.build.status !== "SUCCESS") return false;

  change_data = {
    timestamp: new Date().getTime() / 1000, //create new unix timestamp of now
    data: {
      app_name: jenkins.name,
      phase: jenkins.build.phase,
      outcome: jenkins.build.status //should outcome be here? I think so.
    },
    type: "jenkins build", //should this be action? or should we add another field with 'action'?
    src: "jenkins",
  };

  return change_data;

}


//log a marrow immune system action
//FIXME: This data seems really brittle... Let's clean this up
function handleImmuneAction(immune_data) {
  var change_data;

  //take all the data as is, except for timestamp. Create that now.
  change_data = {
    timestamp: new Date().getTime() / 1000, //create new timestamp of now
    data: immune_data.data,
    type: immune_data.type,
    src: immune_data.src
  };

  return change_data;
}


//start the saving logic
// includes determining what kind of data it is...
// src - github | marrow |
function initSave(data, src) {
  var dfd = Q.defer()
    , promise = dfd.promise
    , change_data
    , dataProcessors = {
      "github": handleGithub,
      "marrow": handleImmuneAction,
      "jenkins": handleJenkins
    }
    , payload = data.payload || data; // if there's a payload obj (marrow, & github, but not jenkins)

  //if it's not an object, then try to parse it...
  if (typeof payload !== "object") {
      //verify payload is a valid JSON obj
    try {
      payload = JSON.parse(payload);
    } catch(e) {

      // console.log('JSON.parse of payload FAILED');
      dfd.reject("JSON.parse of payload FAILED");
      return promise;
    }
  }

  debug("payload", payload);
  debug("src", src);

  change_data = dataProcessors[src](payload);

  debug("change_data", change_data);

  //if no data, abort
  if (!change_data) {
    dfd.reject("save to db failed");
    return promise;
  }

  //add a bson DATE for auto-expiration
  change_data.created_at = new Date();
  //save to DB
  db.save(change_data).then(dfd.resolve, dfd.reject);
  return promise;
}



module.exports = {
  save : initSave
};
