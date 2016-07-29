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
// var config = require( 'config' );
var dp = require( '../test/rest_api/common/providers/statsData.js' );
var utils = require( '../test/rest_api/common/utils.js' );
var prefix_lg = '    • ';
var prefix_sm = '    · ';
var prefix_cccp = '☭ ';


//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  ' + prefix_cccp + 'Test Data Manager - a tool to generate, upload, remove test data from the ES clusters');
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
  console.log('    -v, --verbose :');
  console.log('        blubbing output');
  console.log('    --no-colors :');
  console.log('        non-colored output');
  console.log('    --dry-run :');
  console.log('        show spans and return\n');
};

var conf = { colors: true },
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
  } else if (pars[i] === '-v' || pars[i] === '--verbose') {
    conf.verbose = true;
  } else if (pars[i] === '--no-colors') {
    conf.colors = false;
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

if ( conf.colors ) {
  prefix_lg = '    ' + utils.colored( 'LightBlue', '• ' );
  prefix_sm = '    ' + utils.colored( 'LightBlue', '· ' );
  prefix_ussr = utils.colored( 'Red', '☭ ' );
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

var logger, sublogger;
if ( conf.verbose ) {
  logger = function( msg ) {
    console.log( prefix_lg + msg );
  };
  sublogger = function( msg ) {
    console.log( prefix_sm + msg );
  };
} else {
  logger = sublogger = function() {};
}

//  actions --------------------------------------------------------------------------------------//

//  "process.exit(...)" below is a courtesy to a node v0.10 in ubuntu 14 (fuck, yeah)

if ( action === 'generate' ) {

  var DP_ES = new dp( conf.from, conf.to );
  console.log( '    From date: ' + ( new Date( DP_ES.options.from ) ).toUTCString() );
  console.log( '      To date: ' + ( new Date( DP_ES.options.to ) ).toUTCString() );
  console.log( '      Indices: ' + DP_ES.options.indicesList );

  if ( conf.dry ) {
    process.exit(0);
    return;
  }

  var DP_ESURL = new dp( conf.from, conf.to );
  console.log( prefix_lg + 'start data generation' );
  DP_ES.generateTestingData('es');
  logger( 'ES cluster, generation done, ' + DP_ES.options.dataCount + ' records.' );

  DP_ESURL.generateTestingData('esurl');
  logger( 'ESURL cluster, generation done, ' + DP_ESURL.options.dataCount + ' records.' );
  console.log( prefix_lg + 'start data uploading' );

  var up = [
    DP_ESURL.uploadTestingData( 'esurl', null/*default type*/, sublogger ),
    DP_ES.uploadTestingData( 'es', null/*default type*/, sublogger )
  ];

  return promise.all( up )
    .then( function() {
      console.log( prefix_lg + 'done' );
      process.exit(0);
      return;
    })
    .catch( function( e ) {
      console.trace( e );
      process.exit(1);
    });
}

//  ---------------------------------
if ( action === 'remove' ) {

  var DP_ES = new dp( conf.from, conf.to );
  console.log( '    From date: ' + ( new Date( DP_ES.options.from ) ).toUTCString() );
  console.log( '      To date: ' + ( new Date( DP_ES.options.to ) ).toUTCString() );
  console.log( '      Indices: ' + DP_ES.options.indicesList );

  if ( conf.dry ) {
    process.exit(0);
    return;
  }

  var DP_ESURL = new dp( conf.from, conf.to );
  console.log( prefix_lg + 'start data removing' );

  var rems = [
    DP_ES.removeTestingData( 'es', null/*default type*/, sublogger ),
    DP_ESURL.removeTestingData( 'esurl', null/*default type*/, sublogger )
  ];

  return promise.all( rems )
    .then( function( num ) {
      console.log( prefix_lg + 'done' );
      logger( 'ES cluster:    ' + num[0] + ' records removed' );
      logger( 'ESURL cluster: ' + num[1] + ' records removed' );
      process.exit(0);
    })
    .catch( function( e ) {
      console.trace( e );
      process.exit(1);
    });
}

//  ---------------------------------
if ( action === 'regenerate' ) {

  var day_ms = 3600000 * 24,
    from = Math.floor( ( Date.now() / day_ms ) - 1 ) * day_ms;

  var DP_ESURL = new dp( from, from + ( 2 * day_ms ) /*spans 2 whole days*/ );
  if ( conf.dry ) {
    console.log( prefix_lg + 'data clearance span:' );
    console.log( '    From date: ' + ( new Date( DP_ESURL.options.from ) ).toUTCString() );
    console.log( '      To date: ' + ( new Date( DP_ESURL.options.to ) ).toUTCString() );
    console.log( '      Indices: ' + DP_ESURL.options.indicesList + '\n' );

    DP_ESURL.autoSpan();
    console.log( prefix_lg + 'data generation span:' );
    console.log( '    From date: ' + ( new Date( DP_ESURL.options.from ) ).toUTCString() );
    console.log( '      To date: ' + ( new Date( DP_ESURL.options.to ) ).toUTCString() );
    console.log( '      Indices: ' + DP_ESURL.options.indicesList + '\n' );
    process.exit(0);
    return;
  }

  var DP_ES = new dp( from, from + ( 2 * day_ms ) /*spans 2 whole days*/ );
  console.log( prefix_lg + 'data clearance span:' );
  console.log( '    From date: ' + ( new Date( DP_ES.options.from ) ).toUTCString() );
  console.log( '      To date: ' + ( new Date( DP_ES.options.to ) ).toUTCString() );
  console.log( '      Indices: ' + DP_ES.options.indicesList + '\n' );

  console.log( prefix_lg + 'start data removing' );
  var rems = [
    DP_ES.removeTestingData( 'es', null/*def type*/, sublogger ),
    DP_ESURL.removeTestingData( 'esurl', null/*def type*/, sublogger )
  ];

  return promise.all( rems )
    .then( function( num ) {
      console.log( prefix_lg + 'done' );
      logger( 'ES cluster:    ' + num[0] + ' records removed' );
      logger( 'ESURL cluster: ' + num[1] + ' records removed' );
      DP_ESURL.autoSpan();
      DP_ES.autoSpan();
      console.log( '\n' + prefix_lg + 'data generation span:' );
      console.log( '    From date: ' + ( new Date( DP_ES.options.from ) ).toUTCString() );
      console.log( '      To date: ' + ( new Date( DP_ES.options.to ) ).toUTCString() );
      console.log( '      Indices: ' + DP_ES.options.indicesList + '\n' );

      DP_ES.generateTestingData('es');
      logger( 'ES cluster, generation done, ' + DP_ES.options.dataCount + ' records.' );
      DP_ESURL.generateTestingData('esurl');
      logger( 'ESURL cluster, generation done, ' + DP_ESURL.options.dataCount + ' records.' );
      console.log( prefix_lg + 'start data uploading' );

      var up = [
        DP_ESURL.uploadTestingData( 'esurl', null/*def type*/, sublogger ),
        DP_ES.uploadTestingData( 'es', null/*def type*/, sublogger )
      ];

      return promise.all( up );
    })
    .then( function() {
      console.log( prefix_lg + 'done' );
      process.exit(0);
      return;
    })
    .catch( function( e ) {
      console.trace( e );
      process.exit(1);
    });
}


//  ----------------------------------------------------------------------------------------------//
