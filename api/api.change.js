/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

/**
 * Dependencies
 */
var express = require('express');

/**
 * Local Vars
 */
var app = module.exports = express();

app.get('/', function (req, res) {
  res.send(418);
});
