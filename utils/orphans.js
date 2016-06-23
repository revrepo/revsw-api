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

//  WILD/ORPHANED DOMAINS COLLECT, LOG AND EMAIL
//  ----------------------------------------------------------------------------------------------//

'use strict';

var showHelp = function() {
  console.log('\n  Wild/Orphanded Domains Report Generator - a tool to collect domains belonging to no one.');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2015-11-19"');
  console.log('        optional, default is today');
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
  } else if (curr_par) {
    conf[curr_par] = pars[i];
    curr_par = false;
  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}

//  debug
//  this is 0.10, console.dir( obj, opts ) doesn't work
// var util = require('util');
// var log_ = function( o, d ) {
//   console.log( util.inspect( o, { colors: true, depth: (d || 100), showHidden: true } ) );
// };
//  debug


//  here we go ... -------------------------------------------------------------------------------//

console.log('Orphanded Domains Report');
var bot = require( '../lib/orphansReport.js' );
bot.collectDayReport( conf.date )
  .then( function( data ) {
    // log_( data );
    return bot.mailOrphans( data );
  })
  .then( function( data ) {
    console.log( 'done.\n' );
    process.exit(0);
  })
  .catch( function( err ) {
    console.err( err );
    process.exit(1);
  });


//  ----------------------------------------------------------------------------------------------//
