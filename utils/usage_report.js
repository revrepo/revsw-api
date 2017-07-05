/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

//  USAGE REPORT COLLECT AND STORE
//  ----------------------------------------------------------------------------------------------//
'use strict';

var promise = require('bluebird');

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
  console.log('\n  Usage Report Generator - a tool to collect usage data and store it to the MongoDB');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2015-11-19"');
  console.log('        today assumed if absent');
  console.log('    --accountId :');
  console.log('        a accountId for create Usage Report');
  console.log('    --alert_on_traffic_changes :');
  console.log('        a traffic change alerting');
  console.log('    --traffic_alerting_threshold :');
  console.log('        a traffic change alerting');
  console.log('     --traffic_alerting_email :');
  console.log('        a traffic change alerting');
  console.log('    --dry-run :');
  console.log('        does not store anything (debug mode)');
  console.log('    --verbose, -v :');
  console.log('        show collected data');
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --CLI_MODE :');
  console.log('        used CLI mode logging \n\n');

  process.exit(0);
};

var conf = {
    alert_on_traffic_changes: false,
    accountId: false, // NOTE: "false" is means what all accounts will used
    dry: false // NOTE: by default save data to storage
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
  } else if (pars[i] === '--accountId') {
    curr_par = 'accountId';
  } else if (pars[i] === '--alert_on_traffic_changes') {
    conf.alert_on_traffic_changes = true;
  } else if (pars[i] === '--traffic_alerting_threshold') {
    curr_par = 'traffic_alerting_threshold';
  } else if (pars[i] === '--traffic_alerting_email') {
    curr_par = 'traffic_alerting_email';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '--verbose' || pars[i] === '-v' ) {
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

//  here we go ... -------------------------------------------------------------------------------//

require( '../lib/usageReport.js' ).collectDayReport(
    ( conf.date || 'now' ),
    conf.accountId, //  no particular id(s)
    conf.dry,     //  do not save, return collected data
    true          //  collect orphans
  )
    .then( function( data ) {
      if ( conf.verbose ) {
        log_( data, 2 );
      }
      console.log( 'done.\n' );
    })
  .catch( function( err ) {
    console.log( err );
  })
  .finally( function() {
    process.exit(0);
    return;
  });


//  ----------------------------------------------------------------------------------------------//
