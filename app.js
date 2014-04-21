/**
 * Module Dependencies
 */
var express = require('express')
  , stylus = require('stylus')
  , passport = require('passport')
  , GitHubStrategy = require('passport-github').Strategy
  , debug = require('debug')('marrow:routing')
  , RedisStore = require('connect-redis')(express);

/**
 * Local Dependencies
 */
var db = require('./Models/db') // Configures Mongoose
  , Logger = require('./lib/logger')
  , GitHubApi = require('./lib/auth/github-api.js') //Github API access for auth purposes
  , change_logger = require('./lib/change_logger');

/**
 * Local Declarations
 */
var app = module.exports = express()
  , PORT = process.env.PORT || 5000;

/**
 * Express Configuration
 */

//set up Passport SSO via github
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var rtg = require('url').parse(process.env.REDISTOGO_URL)
  , rtgAuth = rtg.auth.split(':');

app.use(express.cookieParser(process.env.COOKIE_SECRET || 'what does the fox say?'));
app.use(express.session({
  secret: process.env.SESSION_SECRET || "ringydingidyindingdindga ding",
  store : new RedisStore({
    host : rtg.hostname,
    port : rtg.port,
    user : rtgAuth[0],
    pass : rtgAuth[1]
  })
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.PASSPORT_CALLBACK_HOST + "/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, {"accessToken": accessToken, "refreshToken": refreshToken, "profile": profile});
    });
  }
));
//END of Passport SSO

app.use(express.json());
app.use(express.urlencoded());
app.use(stylus.middleware(__dirname + '/assets'));
app.use(express.static(__dirname + '/assets'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

function angularDashboard(req, res, next) {
  var forceDesktop = false
    , mountPath = process.env.MOUNT_PATH || ''
    , assetPath = mountPath + '/'
    , pushState = process.env.PUSH_STATE === 'true'
    , basePath = mountPath + (pushState ? '/' : '#/');

  if (req.query.desktop === 'true' || req.query.desktop === '') {
    forceDesktop = true;
  }
  debug('Loading angular page');
  res.render('layout', {
    req: req,
    desktop : forceDesktop,
    assetPath : assetPath,
    basePath : basePath,
    pushState : pushState
  });
}


/**
 * Angular Dashboard
 */
app.get('/', angularDashboard);


app.get('/partials/:partial', function(req, res) {
  var partial = req.params.partial;
  res.render('partials/' + partial, function(err, html) {
    debug('Attempting partial load: ' + partial);
    if (err) {
      debug('partial failed');
      res.send(404);
    } else {
      debug('sending partial');
      res.end(html);
    }
  });
});

app.use('/api', require('./lib/api'));

/**
 * Adding statuses to the log
 *
 * Should alwasy return a responeCode
 */
app.post('/', function(req, res){
  debug('POST /: ' + req);
  new Logger(req.body).log(function(code) {
    debug('Logger code: ' + code);
    res.send(code);
  });
});

/**
 * Adding items to the changelog
 *
 * Should alwasy return a responseCode
 */
app.post('/change', function(req, res){
  debug('POST /change: ', req);
  var src = false;
  //TODO: have a  lookup table or something that matches up repos to appName in heroku...
  var ua = req.headers['user-agent'];
  debug("headers", req.headers);
  debug("user-agent", ua);


  if (ua.match("GitHub Hookshot")) src = "github"; //TODO: add the IP Address
  if (ua.match("Java")) src = "jenkins"; //TODO: add the IP Address

  // if (! src) return res.send(507);
  if (! src) src = 'github';
  // Not returning. We want to parse after sending response
  res.send(200);

  //save the data
  change_logger(req.body, src).then(function success(stuff) {
    debug('successfully saved change to DB');
    res.send(201);
  }, function fail(err) {
    debug('change post failure: ', err);
    res.send(500, 'Internal Server Error 500: ' + err.name + ':' + err.message);
  });
});


//github SSO auth routes. TODO: move this out of app.js? Make it cleaner?
app.get('/auth/github', passport.authenticate('github', { scope: 'repo' }));

app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/?signin_failed=true' }), function(req, res) {
  // Successful authentication, redirect home.

  //if no user obj, try to login
  if (!req.user) return res.redirect("/login");

  //am I a fs-webdev member?
  GitHubApi.isMember(req, res, 'fs-webdev', req.user.profile.username, function(err, status) {
    if(status === 204) return res.redirect('/'); //yes

    //am I an fs-eng member?
    GitHubApi.isMember(req, res, 'fs-eng', req.user.profile.username, function(err, eng_status) {
      if(eng_status === 204) return res.redirect('/'); //yes

      req.logout(); //sign me out, since I am not a member of fs-eng or fs-webdev
      res.clearCookie('accessToken');
      res.redirect('/?signin_failed=true'); //redirect and show banner
    }); //isMember() fs-eng
    //TODO: move this code out of app.js?
  });//isMember() fs-webdev

});

app.get('/login', function(req, res){
  res.redirect('/auth/github');
});

app.get('/logout', function(req, res){
  req.logout();
  res.clearCookie('accessToken');
  res.redirect('/');
});

app.use(angularDashboard);


app.listen(PORT, function() {
  console.info("Listening on " + PORT);
});
