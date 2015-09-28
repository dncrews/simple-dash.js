/**
 * Description:
 * Allows talking to the github API. We pass the access token (which we get from passport-github)
 * and gain access to github.
 */

/**
 * Deps
 */
var superagent = require('superagent');


//returns the user obj for the authenticated user


// //return repos in fs-webdev
// module.exports.getRepos = function(req, res, cb){

//   if (req.isAuthenticated()) {
//     sendData('https://api.github.com/orgs/fs-webdev/repos', req, res, cb);
//   } else {
//     res.send(401, 'Please authenticate.');
//   }

// };


module.exports.isMember = function(req, res, orgName, userName, cb) {
  if (req.isAuthenticated()) {
    sendData('https://api.github.com/orgs/' + orgName + '/members/' + userName, req, res, function(err, resp) {
      cb(null, resp.status);
    });

  } else {
    res.send(401, 'Please authenticate.');
  }
}; //isMember


function sendData (url, req, res, cb) {
    superagent.get(url)
    // superagent.get('https://api.github.com/repos/fs-webdev/home/readme')
    // superagent.get('https://api.github.com/repos/fs-webdev/home/contents/package.json')
    .set('Accept', 'application/vnd.github.raw+json')
    .set('User-Agent', 'fs-webdev/simple-dash.js')
    .auth(req.user.accessToken, 'x-oauth-basic')
    .end(function(err, data) {
      if (err) cb(err);
      if (data.ok) {
         cb(null, data);
      } else {
         cb(data);
      }
    });
}


