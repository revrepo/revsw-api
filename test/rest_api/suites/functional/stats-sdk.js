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
var parallel = require('mocha.parallel');

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

describe('StatsSDK Functional check:', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  // this.timeout(10000);
  this.timeout(config.get('api.request.maxTimeout'));

  // var user = config.get('api.users.user'),
  var user = config.get('api.users.reseller'),
    account_id,
    application,
    test_data_portions = 4;

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
        console.log( ok_prefix + 'account created: ' +
          Utils.colored( 'LightCyan', account_id ) );
        return API.helpers.apps.createOne(account_id);
      })
      .then(function (newApp) {
        application = newApp;
        console.log( ok_prefix + 'application created: ' +
          Utils.colored( 'LightCyan', application.id ) );
        StatsAPIDDHelper.prepareTestData( application );
        console.log( ok_prefix + 'test data initialized, ES index: ' +
          Utils.colored( 'LightCyan', StatsAPIDDHelper.getESIndexName() ) );
      })
      .then(function () {
        var delay = config.get('stats_api.key_server_poll_interval');
        console.log( ok_prefix + 'waiting ' +
          Utils.colored( 'LightCyan', delay ) +
          'ms for StatsAPI server to be updated' );
      })
      .delay( config.get('stats_api.key_server_poll_interval') )
      .then(function () {
        console.log( ok_prefix + 'upload test data via StatsAPI server' );
        return StatsAPIDDHelper.uploadTestData( test_data_portions );
      })
      .then(function () {
        console.log( ok_prefix + 'wait for the ES clusters to be uploaded' );
        return StatsAPIDDHelper
          .waitForESUploaded( test_data_portions, /*logger*/function( msg ) {
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
  var testOne_ = function( method, query, multiply, checker ) {

    return function( done ) {
      var now = Date.now();
      query.from_timestamp = now - 5400000;
      query.to_timestamp = now + 1800000;
      var id = method === 'app' ? application.id : account_id;
      API.helpers
        .authenticateUser(user)
        .then(function () {
          return API.resources.stats_sdk[method]()
            .getOne(id,query)
            .expect(200)
            .then( function( data ) {
              checker( query, data.body, multiply );
              done();
            });
        })
        .catch(done);
    };
  };

  var testAll_ = function( method, query, multiply, checker ) {

    return function( done ) {
      var now = Date.now();
      query.from_timestamp = now - 5400000;
      query.to_timestamp = now + 1800000;
      query.app_id = application.id;
      API.helpers
        .authenticateUser(user)
        .then(function () {
          return API.resources.stats_sdk[method]()
            .getAll(query)
            .expect(200)
            .then( function( data ) {
              checker( query, data.body, multiply );
              done();
            });
        })
        .catch(done);
    };
  };

  parallel( 'Application/Account', function() {
    it( 'Application/Hits', testOne_( 'app', { report_type: 'hits' },
      test_data_portions, StatsAPIDDHelper.checkAppAccQuery() ) );
    it( 'Application/Devices', testOne_( 'app', { report_type: 'devices' },
      test_data_portions, StatsAPIDDHelper.checkAppAccQuery() ) );
    it( 'Account/Hits', testOne_( 'account', { report_type: 'hits' },
      test_data_portions, StatsAPIDDHelper.checkAppAccQuery() ) );
    it( 'Account/Devices', testOne_( 'account', { report_type: 'devices' },
      test_data_portions, StatsAPIDDHelper.checkAppAccQuery() ) );
    it( 'Dirs', testAll_( 'dirs', {},
      test_data_portions, StatsAPIDDHelper.checkDirsQuery() ) );

  });

  parallel( 'Flows', function() {
    it( 'Flow',
      testAll_( 'flow', {},
        test_data_portions, StatsAPIDDHelper.checkFlowQuery() ) );
    it( 'Aggregated Flow, status_code',
      testAll_( 'agg_flow', { report_type: 'status_code' },
        test_data_portions, StatsAPIDDHelper.checkAggFlowQuery() ) );
    it( 'Aggregated Flow, destination',
      testAll_( 'agg_flow', { report_type: 'destination' },
        test_data_portions, StatsAPIDDHelper.checkAggFlowQuery() ) );
    it( 'Aggregated Flow, transport',
      testAll_( 'agg_flow', { report_type: 'transport' },
        test_data_portions, StatsAPIDDHelper.checkAggFlowQuery() ) );
    it( 'Aggregated Flow, status',
      testAll_( 'agg_flow', { report_type: 'status' },
        test_data_portions, StatsAPIDDHelper.checkAggFlowQuery() ) );
    it( 'Aggregated Flow, cache',
      testAll_( 'agg_flow', { report_type: 'cache' },
        test_data_portions, StatsAPIDDHelper.checkAggFlowQuery() ) );
  });

  parallel( 'Tops', function() {
    it( 'Top Requests, country',
      testAll_( 'top_requests', { report_type: 'country' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery() ) );
    it( 'Top Requests, os',
      testAll_( 'top_requests', { report_type: 'os' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery() ) );
    it( 'Top Requests, device',
      testAll_( 'top_requests', { report_type: 'device' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery() ) );
    it( 'Top Requests, operator',
      testAll_( 'top_requests', { report_type: 'operator' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery() ) );
    it( 'Top Requests, network',
      testAll_( 'top_requests', { report_type: 'network' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery() ) );
    it( 'Top Users, country',
      testAll_( 'top_users', { report_type: 'country' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery(1) ) );
    it( 'Top Users, os',
      testAll_( 'top_users', { report_type: 'os' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery(1) ) );
    it( 'Top Users, device',
      testAll_( 'top_users', { report_type: 'device' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery(1) ) );
    it( 'Top Users, operator',
      testAll_( 'top_users', { report_type: 'operator' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery(1) ) );
    it( 'Top Users, network',
      testAll_( 'top_users', { report_type: 'network' },
        test_data_portions, StatsAPIDDHelper.checkTopsQuery(1) ) );

    it( 'Top GBT, country',
      testAll_( 'top_gbt', { report_type: 'country' },
        test_data_portions, StatsAPIDDHelper.checkTopGBTQuery() ) );
    it( 'Top GBT, os',
      testAll_( 'top_gbt', { report_type: 'os' },
        test_data_portions, StatsAPIDDHelper.checkTopGBTQuery() ) );
    it( 'Top GBT, device',
      testAll_( 'top_gbt', { report_type: 'device' },
        test_data_portions, StatsAPIDDHelper.checkTopGBTQuery() ) );
    it( 'Top GBT, operator',
      testAll_( 'top_gbt', { report_type: 'operator' },
        test_data_portions, StatsAPIDDHelper.checkTopGBTQuery() ) );
    it( 'Top GBT, network',
      testAll_( 'top_gbt', { report_type: 'network' },
        test_data_portions, StatsAPIDDHelper.checkTopGBTQuery() ) );
  });

  parallel( 'Distributions', function() {
    it( 'Distribution, destination',
      testAll_( 'distributions', { report_type: 'destination' },
        test_data_portions, StatsAPIDDHelper.checkDistributionQuery() ) );
    it( 'Distribution, transport',
      testAll_( 'distributions', { report_type: 'transport' },
        test_data_portions, StatsAPIDDHelper.checkDistributionQuery() ) );
    it( 'Distribution, status',
      testAll_( 'distributions', { report_type: 'status' },
        test_data_portions, StatsAPIDDHelper.checkDistributionQuery() ) );
    it( 'Distribution, cache',
      testAll_( 'distributions', { report_type: 'cache' },
        test_data_portions, StatsAPIDDHelper.checkDistributionQuery() ) );
    it( 'Distribution, domain',
      testAll_( 'distributions', { report_type: 'domain' },
        test_data_portions, StatsAPIDDHelper.checkDistributionQuery() ) );
    it( 'Distribution, status_code',
      testAll_( 'distributions', { report_type: 'status_code' },
        test_data_portions, StatsAPIDDHelper.checkDistributionQuery() ) );
  });

  parallel( 'Top Objects', function() {
    it( 'Top Objects',
      testAll_( 'top_objects', {},
        test_data_portions, StatsAPIDDHelper.checkTopObjectQuery() ) );
    it( 'Top Objects, failed',
      testAll_( 'top_objects', { report_type: 'failed' },
        test_data_portions, StatsAPIDDHelper.checkTopObjectQuery() ) );
    it( 'Top Objects, cache_missed',
      testAll_( 'top_objects', { report_type: 'cache_missed' },
        test_data_portions, StatsAPIDDHelper.checkTopObjectQuery() ) );
    it( 'Top Objects, not_found',
      testAll_( 'top_objects', { report_type: 'not_found' },
        test_data_portions, StatsAPIDDHelper.checkTopObjectQuery() ) );
    it( 'Top Objects/Slowest, full',
      testAll_( 'top_objects_slowest', { report_type: 'full' },
        test_data_portions, StatsAPIDDHelper.checkTopObjectSlowestQuery() ) );
    it( 'Top Objects/Slowest, first_byte',
      testAll_( 'top_objects_slowest', { report_type: 'first_byte' },
        test_data_portions, StatsAPIDDHelper.checkTopObjectSlowestQuery() ) );
    it( 'Top Objects/5xx',
      testAll_( 'top_objects_5xx', {},
        test_data_portions, StatsAPIDDHelper.checkTopObject5xxQuery() ) );
  });

  parallel( 'ABs', function() {
    it( 'AB FBT',
      testAll_( 'ab_fbt', {},
        test_data_portions, StatsAPIDDHelper.checkABQuery() ) );
    it( 'AB FBT Distribution',
      testAll_( 'ab_fbt_distribution', {},
        test_data_portions, StatsAPIDDHelper.checkABQuery() ) );
    it( 'AB Errors',
      testAll_( 'ab_errors', {},
        test_data_portions, StatsAPIDDHelper.checkABErrorsQuery() ) );
    it( 'AB Speed',
      testAll_( 'ab_speed', {},
        test_data_portions, StatsAPIDDHelper.checkABQuery() ) );
  });



});



