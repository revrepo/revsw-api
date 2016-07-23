/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */

'use strict';

var util = require('util');
var deepConsoleLog = function (o, d) {
  console.log(util.inspect(o, {colors: true, depth: (d || 100), showHidden: true}));
};

var showHelp = function () {
  console.log('\n  User Activity Reporter - a tool to collect user activity data');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2016-07-22"');
  console.log('        today assumed if absent');
  console.log('    --dry-run :');
  console.log('        does not store anything (debug mode)');
  console.log('    --verbose, -v :');
  console.log('        show collected data');
  console.log('    -h, --help :');
  console.log('        this message\n\n');
  process.exit(0);
};

var conf = {},
  pars = process.argv.slice(2),
  parslen = pars.length,
  curr_par = false;

for (var i = 0; i < parslen; ++i) {

  if (pars[i] === '-h' || pars[i] === '--help') {
    showHelp();
    return;
  }

  if (pars[i] === '--date') {
    curr_par = 'date';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '--verbose' || pars[i] === '-v') {
    conf.verbose = true;
  } else if (curr_par) {
    conf[curr_par] = pars[i];
    curr_par = false;
  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}

require('../lib/activityReport.js').collectDayReport(
    ( conf.date || 'now' ),
    false,    //  no particular ids
    conf.dry  //  do not save, return collected data
  )
  .then(function (data) {
    if (conf.verbose) {
      deepConsoleLog(data, 2);
    }
    console.log('done.\n');
  })
  .catch(function (err) {
    console.log(err);
  })
  .finally(function () {
    process.exit(0);
  });
