[![Build Status](https://travis-ci.org/fs-webdev/simple-dash.js.png)](https://travis-ci.org/fs-webdev/simple-dash.js)

# Important:
- **This app uses gulp to bundle and process client-side assets**
- When developing, keep ```gulp watch``` running, so that the bundled app js and css file updates make it to the view.

# Developing

To run locally, several environment variables are needed, as well as a MongoDB instance and Redis instance. The simplest 
way is to put those variables in a .env file and use heroku local or foreman start to run the application.
You can either install local instances of MongoDB, or point to instances in the cloud. The simplest is to point to the
same instances that the test instance on Heroku is using (https://fs-status-test.herokuapp.com). Some variables cannot
be shared and will need to be changed for you local build. You can get a copy of those variables with:
    
    heroku config -a fs-status-test -s
    OR
    heroku config:pull -a fs-status-test

You will need to change the variables below. Since we use Github to authenticate the application, you will need to copy
the Github client id and secret from the "FS Status Dashboard - localhost" app here: https://github.com/organizations/fs-webdev/settings/applications/71782

    PASSPORT_CALLBACK_HOST="http://localhost:5000"
    GITHUB_CLIENT_ID="id-goes-here"
    GITHUB_CLIENT_SECRET="secret-goes-here"
    PUSH_STATE="true"

You can reuse the values for `MONGOHQ_URL`, `REDISTOGO_URL`, and `DOMAIN_*`. There are additional environment variables
for connecting to Heroku, xMatters, and SendGrid, which you will need to set to test those features, but they are not
required for local development otherwise.

If using a new local database or the existing MONGOHQ_URL for fs-status-test, the app may not have recent enough data
to show any dashboards. You can either add your own data, or simpler is to clone the production database as your initial
data set. Use `mongodump` and `mongorestore` to make a dump of the production fs-status database, and clone it to fs-status-test
or to your local mongob database. Some instructions here: https://docs.compose.io/backups/mongodump-mongorestore.html

# Tests

    npm test

The tests require a mongo database to run. If you have mongodb installed locally, it will use your local version by default. If 
you don't, then you can set the `MONGO_TEST_URL` environment variable and the tests will use that mongo instance instead.

## Contributors
Ordered by date of first contribution. [Auto-generated](https://github.com/dtrejo/node-authors) on Mon, 23 Feb 2015 00:05:38 GMT.

- [Jamis Charles](https://github.com/jamischarles) aka `jamischarles`
- [Dan Crews](https://github.com/dncrews) aka `dncrews`
- [Nic Johnson](https://github.com/nicjohnson) aka `nicjohnson`
- [Aaron King](https://github.com/waaronking) aka `waaronking`
- [Jakob Anderson](https://github.com/spacerockzero) aka `spacerockzero`
