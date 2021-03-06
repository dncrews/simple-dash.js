/**
 * Module Dependencies
 */
var express = require('express')
  , stylus = require('stylus')
  , passport = require('passport')
  , GitHubStrategy = require('passport-github').Strategy
  , debug = require('debug')('marrow:routing')
  , base = require('connect-base')
  , manifest = require('./dist/rev-manifest.json')
  , compression = require('compression')
  , staticCache = require('express-static-cache');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');

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
  , PORT = process.env.PORT || 5000
  , defaultMountPath = process.env.MOUNT_PATH || ''
  , domainMountPath = process.env.DOMAIN_MOUNT_PATH || ''
  , nonDomainGithubConfig = {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.PASSPORT_CALLBACK_HOST + '/auth/github/callback'
  }
  , domainGithubConfig = {
    clientID: process.env.DOMAIN_GITHUB_CLIENT_ID,
    clientSecret: process.env.DOMAIN_GITHUB_CLIENT_SECRET,
    callbackURL: process.env.DOMAIN_PASSPORT_CALLBACK_HOST + '/authenticate/github/callback'
  };


/**
 * Express Configuration
 */

app.set('port', process.env.PORT || 5000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'assets', 'img', 'favicon.ico')));

/* compress responses */
app.use(compression());

//set up Passport SSO via github
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var rtg = require('url').parse(process.env.REDISTOGO_URL)
  , rtgAuth = rtg.auth.split(':');

app.use(cookieParser(process.env.COOKIE_SECRET || 'what does the fox say?'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ringydingidyindingdindga ding',
  store : new RedisStore({
    host : rtg.hostname,
    port : rtg.port,
    user : rtgAuth[0],
    pass : rtgAuth[1]
  }),
  resave: true,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var githubTokenHandler = function(accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    return done(null, {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'profile': profile
    });
  });
};

passport.use('githubNonDomain', new GitHubStrategy(nonDomainGithubConfig, githubTokenHandler));
passport.use('githubDomain', new GitHubStrategy(domainGithubConfig, githubTokenHandler));
//END of Passport SSO

app.use(base({
  host: 'x-orig-host',
  port: 'x-orig-port',
  path: 'x-orig-base',
  proto: 'x-orig-proto'
}));
var distConfig = {
  etag: true,
  maxage: process.env.DIST_EXPIRES || 60, // express.static param (/assets)
  maxAge: process.env.DIST_EXPIRES || 60, // staticCache param (/dist and /vendor)
};
var assetConfig = {
  maxage: process.env.ASSET_EXPIRES || 60, // express.static param (/assets)
  maxAge: process.env.ASSET_EXPIRES || 60, // staticCache param (/dist and /vendor)
};
/* set distconfig to empty when in localdev, so dev isn't troubled by old cached content */
// distConfig = process.env.NODE_ENV !== 'development' ? distConfig : {};

app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* settings for heroku-mounted url */
app.use(stylus.middleware(__dirname + '/assets'));
app.use(staticCache(__dirname + '/assets', assetConfig));

/* serve the bundled, fingerprinted asset files and vendor libs with bulletproof caching */
/**
 * TODO: put these routes under /assets instead of mounting at the root. Was temp. to control
 *       caching params separately between templates, vendor, and app code.
 */
app.use(staticCache(__dirname + '/dist', distConfig));
app.use('/vendor',staticCache(__dirname + '/vendor', distConfig));

/* duplicate settings for familysearch.org/status mounting */
app.use('/status', stylus.middleware(__dirname + '/assets'));
app.use('/status', staticCache(__dirname + '/assets', assetConfig));
app.use('/status', staticCache(__dirname + '/dist', distConfig));
app.use('/status/vendor',staticCache(__dirname + '/vendor', distConfig));

if ('development' === app.get('env')) app.use(logger('dev'));

// Set req.mountPath for use as Heroku app and HAProxy reversed app
app.use(function(req, res, next) {
  req.resolvePath = function(dest) {
    debug(req.base + ' -> ' + dest);

    // If it has a proto just return the path
    if(dest.match(/^http/)) return dest;

    // Concatenate the paths
    var href = req.base + dest;
    debug(href);
    return href;
  };

  var mountPath = defaultMountPath
    , loginPath = '/auth/github'
    , origHost = req.headers['x-orig-host'];

  if (origHost) {
    mountPath = domainMountPath;
    loginPath = '/authenticate/github';
  }
  req.mountPath = mountPath;
  req.loginPath = loginPath;
  next();
});

function angularDashboard(req, res, next) {
  var forceDesktop = false
    , mountPath = req.mountPath
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
    pushState : pushState,
    manifest: manifest
  });
}


/**
 * Angular Dashboard
 */
app.get('/', angularDashboard);
app.use('/api', require('./lib/api'));

/**
 * Adding statuses to the log
 *
 * Should alwasy return a responeCode
 */
app.post('/', function(req, res){
  debug('POST /: ' + JSON.stringify(req.body));
  new Logger(req.body).log(function(code) {
    debug('Logger code: ' + code);
    res.sendStatus(code);
  });
});

/**
 * Adding items to the changelog
 *
 * Should always return a responseCode
 */
app.post('/change', function(req, res){
  debug('POST /change');
  var src = false;
  //TODO: have a  lookup table or something that matches up repos to appName in heroku...
  var ua = req.headers['user-agent'];
  debug('headers', req.headers);
  debug('user-agent', ua);


  if (ua.match('GitHub Hookshot')) src = 'github'; //TODO: add the IP Address
  if (ua.match('GitHub-Hookshot')) src = 'github'; //TODO: add the IP Address
  if (ua.match('Java')) src = 'jenkins'; //TODO: add the IP Address
  if (ua.match('ecBuildHook')) src = 'ec'; //TODO: add the IP Address?

  if (! src) return res.send(507);

  //save the data
  change_logger(req.body, src).then(function success(stuff) {
    debug('successfully saved change to DB');
    res.send(201);
  }, function fail(err) {
    debug('change post failure: ', err);
    res.status(500);
    res.send('Internal Server Error 500: ' + err.name + ':' + err.message);
  });
});


//github SSO auth routes. TODO: move this out of app.js? Make it cleaner?
app.get('/auth/github', passport.authenticate('githubNonDomain', { scope: 'read:org' }));
app.get('/authenticate/github', passport.authenticate('githubDomain', { scope: 'read:org' }));


var callbackHandler = function(req, res) {
  // Successful authentication, redirect home.
  var mountPath = req.mountPath
    , redirectUrl = req.resolvePath('/');

  //if no user obj, try to login
  if (!req.user) return res.redirect(redirectUrl + 'login');

  //am I a fs-webdev member?
  GitHubApi.isMember(req, res, 'fs-webdev', req.user.profile.username, function(err, status) {
    if(status === 204) return res.redirect(redirectUrl); //yes

    //am I an fs-eng member?
    GitHubApi.isMember(req, res, 'fs-eng', req.user.profile.username, function(err, eng_status) {
      if(eng_status === 204) return res.redirect(redirectUrl); //yes

      req.logout(); //sign me out, since I am not a member of fs-eng or fs-webdev
      res.clearCookie('accessToken');
      res.redirect(redirectUrl + '?signin_failed=true'); //redirect and show banner
    }); //isMember() fs-eng
    //TODO: move this code out of app.js?
  });//isMember() fs-webdev

};

app.get('/auth/github/callback', passport.authenticate('githubNonDomain', { failureRedirect: '/' }), callbackHandler);
app.get('/authenticate/github/callback', passport.authenticate('githubDomain', { failureRedirect: '/' }), callbackHandler);

app.get('/login', function(req, res){
  res.redirect(req.resolvePath(req.loginPath));
});

app.get('/logout', function(req, res){
  req.logout();
  res.clearCookie('accessToken');
  res.redirect(req.resolvePath('/'));
});

app.use(angularDashboard);

app.use(errorHandler);

app.listen(PORT, function() {
  console.info('Listening on ' + PORT);
});
