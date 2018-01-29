/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

//  REPORT ORPHANS DOMAINS
//  ----------------------------------------------------------------------------------------------//
'use strict';

var promise = require('bluebird');
var usageReportrDomainOrphans = promise.promisify(require('../lib/usageReport.js').reportDomainOrphans);

//  this is 0.10, console.dir( obj, opts ) doesn't work
var util = require('util');
var log_ = function(o, d) {
  console.log(util.inspect(o, {
    colors: true,
    depth: (d || 100),
    showHidden: true
  }));
};



//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  Report about orphans domains - a tool to collect usage data and send report to admin');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2015-11-19"');
  console.log('        today assumed if absent');
  console.log('    --dry-run :');
  console.log('        does not send email to admin (debug mode)');
  console.log('    --verbose, -v :');
  console.log('        show collected data');
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --CLI_MODE :');
  console.log('        used CLI mode logging \n\n');

  process.exit(0);
};

var conf = {
    dry: false, // NOTE: by default save data to storage
    verbose: false
  },
  pars = process.argv.slice(2),
  parslen = pars.length,
  curr_par = false;

for (var i = 0; i < parslen; ++i) {

  if (pars[i] === '-h' || pars[i] === '--help') {
    showHelp();
    return;
  }

  if (pars[i] === '--CLI_MODE') {
    conf.cli_mode = true;
  } else if (pars[i] === '--date') {
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

// console.log('conf', conf)

//  here we go ... -------------------------------------------------------------------------------//
var countSends = 0;
promise.resolve()
  .then(function() {
    log_('usageReport:collectOrphans:call');
    return usageReportrDomainOrphans({
      date: (conf.date || 'now'),
      dryRun: conf.dry,
      verbose: conf.verbose
    });
  })
  .then(function sucess(data) {
    if (conf.verbose) {
      log_(data, 5);
    }
    console.log('collectOrphans done\n');
  })
  .catch(function(err) {
    console.log(err);
  })
  .finally(function() {
    log_('Script end to work');
    process.exit(0);
    return;
  });

//  ----------------------------------------------------------------------------------------------//
