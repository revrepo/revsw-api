var gulp = require('gulp');
var del = require('del');
var jshint = require('gulp-jshint');
var shell = require('gulp-shell');

gulp.task('clean', function () {
  return del(['results']);
});

gulp.task('lint', function () {
  return gulp.src([
    './*.js',
    './config/**/*.js',
    './suites/**/*.js'
  ])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('smokeTest',
  shell.task([
    'protractor config/smoke.js'
  ]));

gulp.task('regressionTest', shell.task([
  'protractor config/regression.js'
]));

gulp.task('all', ['clean', 'lint', 'smokeTest', 'regressionTest']);

gulp.task('test', ['smokeTest', 'regressionTest']);

gulp.task('default', ['all']);