/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q');

var databaseUrl = process.env.databaseUrl || process.env.MONGOHQ_URL
  , collections = [
    'api_map',
    'api_status',
    'app_bucket',
    'change_log',
    'upstream_status'
  ]
  , mongo = require('mongojs').connect(databaseUrl, collections);

module.exports = mongo;
