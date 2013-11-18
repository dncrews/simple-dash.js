/**
 * admin_db_actions.js
 *
 * This is a script to run one-off db actions like regenerating stats if business rules change, and experimenting.
 TODO: clean this up so we pull in most functions from the other lib files instead of just copying them.. (bad)
 */

//You can call this using:
// $ foreman run node lib/admin_db_actions.js


/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var db = require('./db');

// debug('calling the regen function')
// db.app.regenerateStats();
// db.api.regenerateStats();
// db.upstream.regenerate.heroku();


