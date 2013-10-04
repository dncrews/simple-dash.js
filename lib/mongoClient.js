/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var databaseUrl = process.env.databaseUrl || process.env.MONGOHQ_URL
  , collections = [ 'appBucket', 'apiStatus', 'rawBucket', 'rawStatus' ];

var db = module.exports =  require('mongojs').connect(databaseUrl, collections);
