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

//  ----------------------------------------------------------------------------------------------//

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var reseller = config.get('api.users.reseller'),
    account_id,
    app_id;

  var getCommonSpecDescription = function (queryData) {
    return 'should return success response when using: ' +
      Utils.getJsonAsKeyValueString(queryData);
  };

  //  the `parallel` does NOT wait when `before` completed(bitch), so account_id and app_id
  //  cannot be correctly set in the generated parameters, so we update them right before test run
  var updateQueryData = function( queryData ) {
    if ( queryData.account_id !== undefined ) {
      queryData.account_id = account_id;
    }
    if ( queryData.app_id !== undefined ) {
      queryData.app_id = app_id;
    }
  };

  //  ---------------------------------
  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account_id = newAccount.id;
        console.log( '    ### account created: ' + account_id );
        return API.helpers.apps.create({accountId: account_id});
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
        console.log( '\n    ### cleanup' );
        console.log( '    ### application to be deleted: ' + app_id );
        return API.resources.apps.deleteOne(app_id);
      })
      .then(function () {
        console.log( '    ### account to be deleted: ' + account_id );
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .then(function () {
        console.log( '    ### done' );
      })
      .catch(done);
  });



  //  ---------------------------------
  parallel('StatsSDK/Application resource,', function () {

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
  parallel('StatsSDK/Account resource,', function () {

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
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .dirs()
              .getAll(queryData)
              .expect(200)
              .end( done );
          })
          .catch(done);
      };
    };

    var queries = StatsSDKDDHelper.getDirsQueryParams();
    queries.forEach(function (queryParams) {
      it(getCommonSpecDescription(queryParams),
        getSpecCallback(queryParams));
    });
  });

  //  ---------------------------------
  parallel('StatsSDK/Flow resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
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
      .getFlowQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/Aggregated Flow resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
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
      .getAggFlowQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/TopRequests resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
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
      .getTopsQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/TopUsers resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
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
      .getTopsQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/TopGBT resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
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
      .getTopsQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/Distributions resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .distributions()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getDistributionsQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/TopObjects resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .top_objects()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getTopObjectsQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/TopObjects/Slowest resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .top_objects_slowest()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getTopObjectsSlowestQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/TopObjects/5xx resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .top_objects_5xx()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getTopObjects5xxQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/AB/FBT resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .ab_fbt()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getABQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/AB/FBT Distribution resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .ab_fbt_distribution()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getABFBTDistributionQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/AB/Errors resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .ab_errors()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getABQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

  //  ---------------------------------
  parallel('StatsSDK/AB/Speed resource,', function () {

    var getSpecCallback = function (queryData) {
      return function (done) {
        updateQueryData( queryData );
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.stats_sdk
              .ab_speed()
              .getAll(queryData)
              .expect(200)
              .end(done);
          })
          .catch(done);
      };
    };

    StatsSDKDDHelper
      .getABQueryParams()
      .forEach(function (queryParams) {
        it(getCommonSpecDescription(queryParams),
          getSpecCallback(queryParams));
      });
  });

/*
*/


});



