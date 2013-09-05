/**
 * Deps 
 */
var request = require('superagent');
var express = require('express');
var app = module.exports = express();


app.use(express.bodyParser());


/**
 * TODO:
 * 1) Poll heroku status dashboard somehow & display info here...
 * 2)  

MVP1
 *


 LATER 
 * 3) Add persistent API status (mongo)
 */

//dumb console.log for now
app.get('/', function(req, res){
  
  console.log(req.query);
  res.send(req.query);

});

app.post('/', function(req, res){
  console.log("req.body", req.body);
  console.log("req.body.username", req.body.username);
  res.send(req.body);
  // res.send(200);

});

var port = process.env.PORT || 5000;

app.listen(port, function() {
  console.log("Listening on " + port);
});


