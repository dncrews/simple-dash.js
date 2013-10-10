/**
 * change_log.js
 * Description:
 * Handles saving and getting data for the change_log views (/change)
 *
 */

/**
 * DEPS
 */
var debug = require('debug')('changelog');
var db = require('./mongoClient.js');

//parse the github payload
//@return a json object to inject into the mongo db
function handleGithub(github_payload) {
   //expire after 5 min? or just purge?
  try {
    var github = JSON.parse(github_payload);
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
  var repo_name = github.repository.name;

  var commit_timestamp = github.head_commit.timestamp;
  var commit_hash = github.head_commit.id;
  var commit_msg = github.head_commit.message;
  var commit_url = github.head_commit.url;


  var author = github.head_commit.author;

  //log this data to the DB

   debug("all data in a row:", repo_name + " | " + commit_timestamp + " | " + commit_hash + " | " + commit_msg + " | " + commit_url + " | " + JSON.stringify(author));

  var change_data = {
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

  if (!change_data) { cb("save to db failed") };
  //save to DB
  saveChange(change_data, cb);
}



 module.exports.save = initSave;