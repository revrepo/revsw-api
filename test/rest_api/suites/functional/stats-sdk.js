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

require('should-http');
// var parallel = require('mocha.parallel');

var config = require('config');
var API = require('./../../common/api');
var Utils = require('./../../common/utils');

var StatsSDKDP = require('./../../common/providers/data/stats-sdk');
var StatsSDKDDHelper = StatsSDKDP.DataDrivenHelper;

var StatsAPIDP = require('./../../common/providers/data/stats-api');
var StatsAPIDDHelper = StatsAPIDP.DataDrivenHelper;

//  ---------------------------------

var ok_prefix = '    ' + Utils.colored( 'LightBlue', '•' ) + ' ';

//  ----------------------------------------------------------------------------------------------//

describe('Functional check:', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  // this.timeout(10000);
  this.timeout(config.get('api.request.maxTimeout'));

  // var user = config.get('api.users.user'),
  var user = config.get('api.users.reseller'),
    account_id,
    application,
    testdata = StatsAPIDDHelper.getTestData(),
    estimated = StatsAPIDDHelper.getEstimatedData(),
    test_data_portions = 4,
    total_requests = test_data_portions * testdata.requests.length;


  //  ---------------------------------
  before(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(function () {
        console.log( '   "before all" hook, testing data creation' );
        console.log( ok_prefix + 'user authenticated' );
        return StatsAPIDDHelper.healthcheck();
      })
      .then(function () {
        console.log( ok_prefix + 'StatsAPI health check passed' );
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account_id = newAccount.id;
        console.log( ok_prefix + 'account created: ' + Utils.colored( 'LightCyan', account_id ) );
        return API.helpers.apps.createOne(account_id);
      })
      .then(function (newApp) {
        application = newApp;
        console.log( ok_prefix + 'application created: ' + Utils.colored( 'LightCyan', application.id ) );
        StatsAPIDDHelper.prepareTestData( application );
        console.log( ok_prefix + 'test data initialized, ES index: ' + Utils.colored( 'LightCyan', StatsAPIDDHelper.getESIndexName() ) );
      })
      .then(function () {
        var delay = config.get('stats_api.key_server_poll_interval');
        console.log( ok_prefix + 'waiting ' + Utils.colored( 'LightCyan', delay ) + 'ms for StatsAPI server to be updated' );
      })
      .delay( config.get('stats_api.key_server_poll_interval') )
      .then(function () {
        console.log( ok_prefix + 'upload test data via StatsAPI server' );
        return StatsAPIDDHelper.uploadTestData( test_data_portions );
      })
      .then(function () {
        console.log( ok_prefix + 'wait for the ES clusters to be uploaded' );
        return StatsAPIDDHelper.waitForESUploaded( test_data_portions, /*logger*/function( msg ) {
          console.log( '        ' + Utils.colored( 'LightBlue', '·' ) + ' ' + msg );
        });
      })
      .then(function () {
        console.log( ok_prefix + 'done\n' );
        done();
      })
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(function () {
        console.log( '\n   "after all" hook, cleanup' );
        if ( application ) {
          console.log( ok_prefix + 'new application to be deleted' );
          return API.resources.apps.deleteOne(application.id);
        }
      })
      .then(function () {
        if ( account_id ) {
          console.log( ok_prefix + 'new account to be deleted' );
          return API.resources.accounts.deleteAllPrerequisites(done);
        }
      })
      .then(function () {
        console.log( ok_prefix + 'done' );
      })
      .catch(done);
  });


  //  ---------------------------------
  // it( 'Application', function( done ) {
  //   setTimeout( done, 1000 );
  // } );


  //  ---------------------------------
  it( 'StatsSDK/Application/Hits', function( done ) {

    var now = Date.now();
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.resources.stats_sdk
          .app()
          .getOne(application.id, {
            from_timestamp: ( now - 5400000 ),
            to_timestamp: ( now + 1800000 ),
            report_type: 'hits'
          })
          .expect(200)
          .then( function( data ) {
            // console.log( data.body );
            data.body.data.hits.should.be.equal( test_data_portions );
            done();
          });
      })
      .catch(done);

  });

  //  ---------------------------------
  it( 'StatsSDK/Application/Devices', function( done ) {

    var now = Date.now();
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.resources.stats_sdk
          .app()
          .getOne(application.id, {
            from_timestamp: ( now - 5400000 ),
            to_timestamp: ( now + 1800000 ),
            report_type: 'devices'
          })
          .expect(200)
          .then( function( data ) {
            data.body.data.hits.should.be.equal( test_data_portions );
            data.body.data.devices_num.should.be.equal( 1 );
            done();
          });
      })
      .catch(done);

  });

  //  ---------------------------------
  it( 'StatsSDK/Account/Hits', function( done ) {

    var now = Date.now();
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.resources.stats_sdk
          .account()
          .getOne(account_id, {
            from_timestamp: ( now - 5400000 ),
            to_timestamp: ( now + 1800000 ),
            report_type: 'hits'
          })
          .expect(200)
          .then( function( data ) {
            data.body.data.hits.should.be.equal( test_data_portions );
            done();
          });
      })
      .catch(done);
  });

  //  ---------------------------------
  it( 'StatsSDK/Account/Devices', function( done ) {

    var now = Date.now();
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.resources.stats_sdk
          .account()
          .getOne(account_id, {
            from_timestamp: ( now - 5400000 ),
            to_timestamp: ( now + 1800000 ),
            report_type: 'devices'
          })
          .expect(200)
          .then( function( data ) {
            data.body.data.hits.should.be.equal( test_data_portions );
            data.body.data.devices_num.should.be.equal( 1 );
            done();
          });
      })
      .catch(done);
  });

  // //  ---------------------------------
  // it( 'StatsSDK/Dirs', function( done ) {

  //   var now = Date.now();
  //   API.helpers
  //     .authenticateUser(user)
  //     .then(function () {
  //       return API.resources.stats_sdk
  //         .dirs()
  //         .getAll({
  //           app_id: application.id,
  //           from_timestamp: ( now - 5400000 ),
  //           to_timestamp: ( now + 1800000 )
  //         })
  //         .expect(200)
  //         .then( function( data ) {
  //           console.log( data.body );
  //           done();
  //         });
  //     })
  //     .catch(done);
  // });

  //  ---------------------------------
  it( 'StatsSDK/Flow', function( done ) {

    var now = Date.now();
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.resources.stats_sdk
          .flow()
          .getAll({
            app_id: application.id,
            from_timestamp: ( now - 5400000 ),
            to_timestamp: ( now + 1800000 )
          })
          .expect(200)
          .then( function( data ) {
            // console.log( data.body );
            data.body.metadata.total_hits.should.be.equal( test_data_portions * estimated.total_hits );
            data.body.metadata.total_sent.should.be.equal( test_data_portions * estimated.total_sent );
            data.body.metadata.total_received.should.be.equal( test_data_portions * estimated.total_received );
            data.body.metadata.total_spent_ms.should.be.equal( test_data_portions * estimated.total_spent_ms );
            done();
          });
      })
      .catch(done);

  });






});



