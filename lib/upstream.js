/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var request = require('superagent')
  , Q = require('q');

function updateHeroku() {
  var dfd = Q.defer();


  request
  .get('https://status.heroku.com/api/v3/current-status')
  .set('accept', 'application/json')
  .end(function(err, resp) {
    console.log(resp.body);



    dfd.resolve();
  });



  return dfd.promise;
}


module.exports = {};
