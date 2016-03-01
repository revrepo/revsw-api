/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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
var log_ = function( o, d ) {
  console.log( util.inspect( o, { colors: true, depth: (d || 100), showHidden: true } ) );
}



//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  Usage Report Generator - a tool to collect usage data and store it to the MongoDB');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2015-11-19" or "-3d"');
  console.log('        today assumed if absent');
  console.log('    --dry-run :');
  console.log('        show collected data, does not store anything (debug mode)');
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

require( '../lib/usageReport.js' ).collectDayReport( ( conf.date || 'now' ), conf.dry/*do not save, return collected data*/ )
  .then( function( data ) {
    if ( conf.dry ) {
      log_( data, 3 );
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
