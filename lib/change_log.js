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
  commit_timestamp = new Date(commit_timestamp).getTime() / 1000;

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

//log a marrow immune system action
//FIXME: This data seems really brittle... Let's clean this up
function handleImmuneAction(immune_data) {
  var change_data;

  //take all the data as is, except for timestamp. Create that now.
  change_data = {
    timestamp: Date.now(), //create new timestamp of now
    data: immune_data.data,
    type: immune_data.type,
    src: immune_data.src
  };

  return change_data;
}


//save change to Mongo
function saveChange(data, cb) {
  db.mongo.change_log.insert(data, cb);
}

//start the saving logic
// includes determining what kind of data it is...
function initSave(data, cb) {
  var change_data;
  var payload = data.payload; //github passes a payload object

  //if it's not an object, then try to parse it...
  if (typeof payload !== "object") {
      //verify payload is a valid JSON obj
    try {
      payload = JSON.parse(payload);
    } catch(e) {
      // console.log('JSON.parse of payload FAILED');
      return cb("JSON.parse of payload FAILED");
    }
  }


  debug("payload", payload);

  // {payload: {
  //   data : {
  //     app_name : appName
  //   },
  //   src: "marrow",
  //   type: "marrow restart"
  // }}

  //if github, parse github data. If marrow, parse it using those rules...
  if (payload.src === "github") {
    change_data = handleGithub(payload);
  } else if(payload.src === "marrow") {
    change_data = handleImmuneAction(payload);
  }


  if (!change_data) { cb("save to db failed"); }
  //save to DB
  saveChange(change_data, cb);
}



module.exports = {
  save : initSave
};
