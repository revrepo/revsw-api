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
var rep = require( '../lib/usageReport.js' );

//  this is 0.10, console.dir( obj, opts ) doesn't work, fuck yeah
var util = require('util');
var log_ = function( o ) {
  console.log( util.inspect( o, { colors: true, depth: null, showHidden: true } ) );
}



//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  Usage Report Generator - a tool to collect usage data and store it to the MongoDB');
  console.log('  Usage:');
  console.log('    --from :');
  console.log('        date/time to start from, for ex. "2015-11-19 15:00 UTC", required');
  console.log('    --to :');
  console.log('        date/time to finish to, for ex. "2015-11-19 23:59 UTC"');
  console.log('        if absent then the [--from] parameter denotes day to make span from');
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --dry-run :');
  console.log('        show spans and collected data, does not store anything\n');
};

var conf = {},
  pars = process.argv.slice(2),
  parslen = pars.length,
  curr_par = false;

if (parslen === 0) {
  showHelp();
  return;
}

for (var i = 0; i < parslen; ++i) {

  if (pars[i] === '-h' || pars[i] === '--help') {
    showHelp();
    return;
  }

  // if ( curr_par && pars[i].substr( 0, 1 ) === '-' ) {
  //   curr_par = false;
  // }

  if (pars[i] === '--from') {
    curr_par = 'from';
  } else if (pars[i] === '--to') {
    curr_par = 'to';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '-v' || pars[i] === '--verbose') {
    conf.verbose = true;
  } else if (curr_par) {
    conf[curr_par] = pars[i];
  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}


if ( !conf.from ) {
  console.error( 'from parameter required ...' );
  showHelp();
  return;
}

//  here we go ... -------------------------------------------------------------------------------//


rep.collect( conf.from, conf.to )
  .then( function( data ) {
    // console.dir( data[0].account_domains_count, { showHidden: true, depth: 5, colors: true } );
    // console.dir( data[1], { showHidden: true, depth: 5, colors: true } );
    // console.dir( data[2], { showHidden: true, depth: 5, colors: true } );
    log_( data );
  })
  .catch( function( err ) {
    console.log( err );
  })
  .finally( function() {
    process.exit(0);
    return;
  });

// var DP_ES = new dp( conf.from, conf.to );
// console.log( '    From date: ' + ( new Date( DP_ES.options.from ) ).toUTCString() );
// console.log( '      To date: ' + ( new Date( DP_ES.options.to ) ).toUTCString() );
// console.log( '      Indices: ' + DP_ES.options.indicesList );

// if ( conf.dry ) {
//   process.exit(0);
//   return;
// }

// var DP_ESURL = new dp( conf.from, conf.to );
// console.log( '    ### start data generation' );
// DP_ES.generateTestingData('es');
// if ( conf.verbose ) {
//   console.log( '    ### ES cluster, generation done, ' + DP_ES.options.dataCount + ' records.' );
// }
// DP_ESURL.generateTestingData('esurl');
// if ( conf.verbose ) {
//   console.log( '    ### ESURL cluster, generation done, ' + DP_ESURL.options.dataCount + ' records.' );
// }
// console.log( '    ### start data uploading' );

// var up = [
//   DP_ESURL.uploadTestingData( 'esurl', conf.verbose ),
//   DP_ES.uploadTestingData( 'es', conf.verbose )
// ];

// return promise.all( up )
//   .then( function() {
//     console.log( '    ### done' );
//     process.exit(0);
//     return;
//   })
//   .catch( function( e ) {
//     console.trace( e );
//     process.exit(1);
//   });

//  ----------------------------------------------------------------------------------------------//
