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

var _ = require('lodash'),
  elastic = require('elasticsearch'),
  config = require( 'config' ),
  promise = require('bluebird'),
  fs = promise.promisifyAll(require('fs'));

var dp = require( './statsData.js' );

//  CLI -----------------------------

var showHelp = function() {
  //  here's no place for logger
  console.log('\n  Test Data Manager - a tool to generate, upload, remove test data from the ES cluster');
  console.log('  Usage:');
  console.log('    --gen, --generate :');
  console.log('        generate data' );
  console.log('    --remove :');
  console.log('        remove testing data from ES cluster' );
  console.log('    --from :');
  console.log('        from date');
  console.log('    --to :');
  console.log('        to date');
  console.log('    --load-meta :');
  console.log('        load parameters from statsMeta.json');
  console.log('    --save-data :');
  console.log('        save generated data, not only meta');
  console.log('    --not-upload :');
  console.log('        do not upload generated data to ES cluster');
  console.log('    -v, --verbose :');
  console.log('        blabbing output');
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --dry-run :');
  console.log('        show config and return');
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
  } else if (pars[i] === '--load-meta') {
    conf.loadmeta = true;
  } else if (pars[i] === '--save-data') {
    conf.savedata = true;
  } else if (pars[i] === '--not-upload') {
    conf.notupload = true;
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '--gen' || pars[i] === '--generate') {
    action = 'generate';
  } else if (pars[i] === '--remove') {
    action = 'remove';
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

if ( ( !conf.to || !conf.from) && !conf.loadmeta ) {
  conf.loadmeta = true;
  console.log('insufficient from/to data, meta will be loaded ...');
}

//  actions --------------------------------------------------------------------------------------//

//  "process.exit(...)" below is a courtesy to a node v0.10 in ubuntu 14 (fuck, yeah)

if ( action === 'generate' ) {

  var DP;

  ( function() {
    if ( conf.loadmeta ) {
      DP = new dp();
      return DP.readTestingData();
    } else {
      DP = new dp( conf.from, conf.to );
      return promise.resolve( DP );
    }
  })()
  .then( function() {
    console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
    console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
    console.log( '      Indices: ' + DP.options.indicesList );
    if ( conf.dry ) {
      process.exit(0);
    }
    console.log( '    ### start data generation' );
    return DP.generateTestingData( conf.savedata );
  })
  .then( function() {
    console.log( '    ### generation done, ' + DP.options.dataCount + ' records.' );
    if ( conf.notupload ) {
      return false;
    }
    console.log( '    ### start data uploading' );
    return DP.uploadTestingData();
  })
  .then( function() {
    if ( conf.notupload ) {
      return false;
    }
    console.log( '    ### uploading done' );
    process.exit(0);
  })
  .catch( function( e ) {
    console.trace( e );
    process.exit(1);
  })

  return;
}

if ( action === 'remove' ) {

  var DP;

  ( function() {
    if ( conf.loadmeta ) {
      DP = new dp();
      return DP.readTestingData();
    } else {
      DP = new dp( conf.from, conf.to );
      return promise.resolve( DP );
    }
  })()
  .then( function() {
    console.log( '    From date: ' + ( new Date( DP.options.from ) ).toUTCString() );
    console.log( '      To date: ' + ( new Date( DP.options.to ) ).toUTCString() );
    console.log( '      Indices: ' + DP.options.indicesList );
    if ( conf.dry ) {
      process.exit(0);
    }
    console.log( '    ### start data removing' );
    return DP.removeTestingData();
  })
  .then( function() {
    console.log( '    ### removing done' );
    process.exit(0);
  })
  .catch( function( e ) {
    console.trace( e );
    process.exit(1);
  })

  return;
}


//  ----------------------------------------------------------------------------------------------//
