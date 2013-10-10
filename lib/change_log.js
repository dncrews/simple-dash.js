/**
 * change_log.js
 * Description:
 * Handles saving and getting data for the change_log views (/change)
 *
 */

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

/**
 * DEPS
 */
var debug = require('debug')('changelog');

/**
 * Local Vars
 */
var db = require('./mongoClient.js');

//parse the github payload
//@return a json object to inject into the mongo db
function handleGithub(github_payload) {
  var github, repo_name, commit_timestamp, commit_hash, commit_msg, commit_url, author, change_data;

   //expire after 5 min? or just purge?
  try {
    github = JSON.parse(github_payload);
  } catch(e) {
    console.log('JSON.parse of payload FAILED');
    return false;
  }


  debug("github PAYLOAD", github);

  //if the github push is agains a branch that is NOT master, exit.
  if (github.ref !== 'refs/heads/master') return;


  //fetch all the github commit data
  debug("github.repository", github.repository);
  debug("github.repository.name", github.repository.name);
  repo_name = github.repository.name;

  commit_timestamp = github.head_commit.timestamp;
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

  debug("change_data", change_data);


  //return data obj
  return change_data;
}



//save change to Mongo
function saveChange(data, cb) {
  db.mongo.change_log.insert(data, cb);
}

//start the saving logic
function initSave(payload, cb) {
  //if github, parse github data
  payload = payload.payload; //github passes a payload option

  //parse the data for the DB
  var change_data = handleGithub(payload);

  if (!change_data) { cb("save to db failed"); }
  //save to DB
  saveChange(change_data, cb);
}



module.exports = {
  save : initSave
};
