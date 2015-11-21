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

//  TEST DATA MANAGER
//  ----------------------------------------------------------------------------------------------//
'use strict';

var promise = require('bluebird');
var dp = require( './statsData.js' );

//  CLI -----------------------------

var showHelp = function() {
  //  here's no place for logger
  console.log('\n  Test Data Manager - a tool to generate, upload, remove test data from the ES clusters');
  console.log('  Usage:');
  console.log('    --gen, --generate :');
  console.log('        generate data' );
  console.log('    --remove :');
  console.log('        remove testing data from ES cluster' );
  console.log('    --from :');
  console.log('        from date, for ex. "2015-11-19 15:00 UTC", required for generate and remove');
  console.log('    --to :');
  console.log('        to date, for ex. "2015-11-19 23:59 UTC", required for generate and remove');
  console.log('    --regenerate :');
  console.log('        auto remove old data and regenerate a new:' );
  console.log('         data will be removed within last 2 full days span' );
  console.log('         data will be generated for the yesterday\'s second half of day if invoked before noon' );
  console.log('         and for the todays\'s first half of day if invoked after noon' );
  console.log('         --to and --from parameters will be ignored' );
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --dry-run :');
  console.log('        show spans and return\n');
};

var conf = {},
  pars = process.argv.slice(2),
  parslen = pars.length,
  curr_par = false,
  action = '';

if (parslen === 0) {
  showHelp();
  return;
}

for (var i = 0; i < parslen; ++i) {

  if (pars[i] === '-h' || pars[i] === '--help') {
    showHelp();
    return;
  }

  if ( curr_par && pars[i].substr( 0, 1 ) === '-' ) {
    curr_par = false;
  }

  if (pars[i] === '--from') {
    curr_par = 'from';
  } else if (pars[i] === '--to') {
    curr_par = 'to';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '--gen' || pars[i] === '--generate') {
    action = 'generate';
  } else if (pars[i] === '--remove') {
    action = 'remove';
  } else if (pars[i] === '--regenerate') {
    action = 'regenerate';
  } else if (curr_par) {
    conf[curr_par] = pars[i];
  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}

if (action === '') {
  console.error('\n    the action is not specified');
  showHelp();
  return;
}

if ( ( !conf.to || !conf.from) && action !== 'regenerate' ) {
  console.error( 'insufficient from/to data, meta will be loaded ...' );
  showHelp();
  return;
}

//  actions --------------------------------------------------------------------------------------//

//  "process.exit(...)" below is a courtesy to a node v0.10 in ubuntu 14 (fuck, yeah)

if ( action === 'generate' ) {

  var DP = new dp( conf.from, conf.to );
  console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
  console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
  console.log( '      Indices: ' + DP.options.indicesList );

  if ( conf.dry ) {
    process.exit(0);
    return;
  }

  console.log( '    ### start data generation' );
  DP.generateTestingData();
  console.log( '    ### generation done, ' + DP.options.dataCount + ' records.' );
  console.log( '    ### start data uploading' );
  return DP.uploadTestingData()
    .then( function() {
      console.log( '    ### uploading done' );
      process.exit(0);
    })
    .catch( function( e ) {
      console.trace( e );
      process.exit(1);
    });

  return;
}

//  ---------------------------------
if ( action === 'remove' ) {

  var DP = new dp( conf.from, conf.to );
  console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
  console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
  console.log( '      Indices: ' + DP.options.indicesList );

  if ( conf.dry ) {
    process.exit(0);
    return;
  }

  console.log( '    ### start data removing' );
  return DP.removeTestingData()
    .then( function( num ) {
      console.log( '    ### removing done, ' + num + ' records removed' );
      process.exit(0);
    })
    .catch( function( e ) {
      console.trace( e );
      process.exit(1);
    });

  return;
}

//  ---------------------------------
if ( action === 'regenerate' ) {

  var DP,
    day_ms = 3600000 * 24,
    from = Math.floor( ( Date.now() / day_ms ) - 1 ) * day_ms;

  if ( conf.dry ) {
    DP = new dp( from, from + ( 2 * day_ms ) /*spans 2 whole days*/ );
    console.log( '    ### data clearance span:' );
    console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
    console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
    console.log( '      Indices: ' + DP.options.indicesList + '\n' );

    DP.autoSpan();
    console.log( '    ### data generation span:' );
    console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
    console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
    console.log( '      Indices: ' + DP.options.indicesList + '\n' );
    process.exit(0);
    return;
  }

  DP = new dp( from, from + ( 2 * day_ms ) /*spans 2 whole days*/ );
  console.log( '    ### data clearance span:' );
  console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
  console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
  console.log( '      Indices: ' + DP.options.indicesList + '\n' );

  console.log( '    ### start data removing' );
  return DP.removeTestingData()
    .then( function( num ) {
      console.log( '    ### removing done, ' + num + ' records removed\n' );
      DP.autoSpan();
      console.log( '    ### data generation span:' );
      console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
      console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
      console.log( '      Indices: ' + DP.options.indicesList + '\n' );

      console.log( '    ### start data generation' );
      DP.generateTestingData();
      console.log( '    ### generation done, ' + DP.options.dataCount + ' records.' );
      console.log( '    ### start data uploading' );
      return DP.uploadTestingData();
    })
    .then( function() {
      console.log( '    ### uploading done' );
      process.exit(0);
    })
    .catch( function( e ) {
      console.trace( e );
      process.exit(1);
    });

  return;
}


//  ----------------------------------------------------------------------------------------------//
