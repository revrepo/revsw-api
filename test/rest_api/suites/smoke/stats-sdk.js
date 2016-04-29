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

require('should-http');
var parallel = require('mocha.parallel');

var config = require('config');
var API = require('./../../common/api');
var Utils = require('./../../common/utils');
var StatsSDKDP = require('./../../common/providers/data/stats-sdk');
var StatsSDKDDHelper = StatsSDKDP.DataDrivenHelper;

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var reseller = config.get('api.users.reseller');
  // var account_id = reseller.account_id;
  // var app_id = reseller.app_id;
  var account_id;
  var app_id;

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account_id = newAccount.id;
        console.log( '    ### account created: ' + account_id );
        return API.helpers.apps.createOne(account_id);
      })
      .then(function (newApp) {
        app_id = newApp.id;
        console.log( '    ### application created: ' + app_id + '\n' );
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.resources.apps.deleteOne(app_id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  var getCommonSpecDescription = function (queryData) {
    return 'should return success response when using: ' +
      Utils.getJsonAsKeyValueString(queryData);
  };

  it( 'account and app created', function() {

    this.timeout(config.get('api.request.maxTimeout'));

    //  ---------------------------------
    parallel.skip('StatsSDK/Application resource,', function () {

      var getSpecCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats_sdk
                .app()
                .getOne(app_id, queryData)
                .expect(200)
                .end(done);
            })
            .catch(done);
        };
      };

      StatsSDKDDHelper
        .getAppAccQueryParams()
        .forEach(function (queryParams) {
          it(getCommonSpecDescription(queryParams),
            getSpecCallback(queryParams));
        });
    });

    //  ---------------------------------
    parallel.skip('StatsSDK/Account resource,', function () {

      var getSpecCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats_sdk
                .account()
                .getOne(account_id, queryData)
                .expect(200)
                .end(done);
            })
            .catch(done);
        };
      };

      StatsSDKDDHelper
        .getAppAccQueryParams()
        .forEach(function (queryParams) {
          it(getCommonSpecDescription(queryParams),
            getSpecCallback(queryParams));
        });
    });

    //  ---------------------------------
    parallel('StatsSDK/Directories resource,', function () {

      var getSpecCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats_sdk
                .dirs()
                .getAll(queryData)
                .expect(200)
                .end(done);
            })
            .catch(done);
        };
      };

      var queries = StatsSDKDDHelper.getDirsQueryParams( account_id, app_id );
      // console.log( queries );
      queries.forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
    });

  });


/*
  //  ---------------------------------
  parallel.skip('StatsSDK/Flow resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .flow()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getFlowQueryParams( account_id, app_id )
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel.skip('StatsSDK/Aggregated Flow resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .agg_flow()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getAggFlowQueryParams( account_id, app_id )
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel.skip('StatsSDK/TopRequests resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .top_requests()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getTopsQueryParams( account_id, app_id )
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel.skip('StatsSDK/TopUsers resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .top_users()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getTopsQueryParams( account_id, app_id )
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel.skip('StatsSDK/TopGBT resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .top_gbt()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getTopsQueryParams( account_id, app_id )
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

*/

});
