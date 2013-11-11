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

app.use('/app', require('./api.app.js'));
app.use('/api', require('./api.api.js'));
app.use('/upstream', require('./api.upstream.js'));
app.use('/change', require('./api.change.js'));
