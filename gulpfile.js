var gulp       = require('gulp');
var concat     = require('gulp-concat');
var stylus     = require('gulp-stylus');
var csso       = require('gulp-csso');
var uglify     = require('gulp-uglifyjs');
var rev        = require('gulp-rev');
var rename     = require("gulp-rename");
var cssBase64  = require("gulp-css-base64");
var ngmin      = require("gulp-ngmin");
var clean      = require('gulp-clean');
var appCSS = [
  './assets/vendor/bootstrap/css/bootstrap.css',
  './assets/vendor/bootstrap/css/bootstrap-theme.css',
  './assets/vendor/rickshaw.min.css',
  './assets/css/dashboard.styl'
];
var appJS = [
  './assets/vendor/jquery-2.1.0.min.js',
  './assets/vendor/angular.min.js',
  './assets/vendor/bootstrap/js/bootstrap.js',
  './assets/vendor/moment.min.js',
  './assets/js/routes.js',
  './assets/js/routesHTML5.js',
  './assets/js/controllers.js',
  './assets/js/directives.js',
  './assets/js/services.js',
  './assets/js/d3Service.js',
  './assets/js/d3Directives.js'
];

/* remove previous dist files */
gulp.task('clean', function () {
  return gulp.src('./dist/')
    .pipe(clean({read:false}));
});

/* bundle all css together */
gulp.task('css', function () {
  return gulp.src(appCSS)
    .pipe(stylus({compress:true}))
    .pipe(cssBase64())
    .pipe(concat('styles.css'))
    .pipe(csso())
    .pipe(gulp.dest('./dist/'));
});

/* jsApp bundles the js files needed by the app once the user has logged in */
gulp.task('js', function () {
  return gulp.src(appJS)
    .pipe(ngmin())
    .pipe(uglify())
    .pipe(concat('app.js'))
    .pipe(gulp.dest("./dist/"));
});

/* Rev: fingerprint filenames and build manifest lookup */
gulp.task('rev', ['clean','css', 'js'], function() {
  return gulp.src(['./dist/**/*.css', './dist/**/*.js'])
    .pipe(rev())
    .pipe(gulp.dest('./dist'))
    .pipe(rev.manifest())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function() {
  gulp.watch('./assets/**/*', ['rev']);
});

gulp.task('default', ['rev']);