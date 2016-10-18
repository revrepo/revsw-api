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
var Joi = require('joi');

var config = require('config');
var API= require('./../../../common/api');
var Utils= require('./../../../common/utils');
var CommonRespSP= require('./../../../common/providers/schema/commonResponse');
var StatsSP= require('./../../../common/providers/schema/statsResponse');
var StatsDP= require('./../../../common/providers/data/stats');
var StatsDDHelper = StatsDP.DataDrivenHelper;

describe('Sanity check.', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');
  var statsErrorSchema = CommonRespSP.getError();
  var statsValidationErrorSchema = StatsSP.getValidationError();

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
        return API.helpers.domainConfigs.createOne(account.id);
      })
      .then(function (newDomainConfig) {
        domainConfig = newDomainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.resources.domainConfigs.deleteOne(domainConfig.id);
      })
      .catch(done);
  });

  describe('Stats resource.', function () {
    parallel('Error Response Data Schema,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return domain\'s stats applying `error response` ' +
          'schema when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecWithoutAuthCallback = function (queryData) {
        return function (done) {
          API.session.reset();
          API.resources.stats
            .getOne(domainConfig.id, queryData)
            .expect(401)
            .then(function (response) {
              var stat = response.body;
              Joi.validate(stat, statsErrorSchema, done);
            })
            .catch(done);
        };
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (response) {
                  var stat = response.body;
                  Joi.validate(stat, statsValidationErrorSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper
        .getQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecWithoutAuthCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });

      StatsDDHelper
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('GBT: Error Response Data Schema,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return domain\'s stats applying `error response` ' +
          'schema when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecWithoutAuthCallback = function (queryData) {
        return function (done) {
          API.session.reset();
          API.resources.stats
            .gbt()
            .getOne(domainConfig.id, queryData)
            .expect(401)
            .then(function (response) {
              var stat = response.body;
              Joi.validate(stat, statsErrorSchema, done);
            })
            .catch(done);
        };
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .gbt()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (response) {
                  var stat = response.body;
                  Joi.validate(stat, statsValidationErrorSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.gbt
        .getQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecWithoutAuthCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });

      StatsDDHelper.gbt
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('Last Mile RTT: Error Response Data Schema,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return domain\'s stats applying `error response` ' +
          'schema when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecWithoutAuthCallback = function (queryData) {
        return function (done) {
          API.session.reset();
          API.resources.stats
            .lastMileRtt()
            .getOne(domainConfig.id, queryData)
            .expect(401)
            .then(function (response) {
              var stat = response.body;
              Joi.validate(stat, statsErrorSchema, done);
            })
            .catch(done);
        };
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .lastMileRtt()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (response) {
                  var stat = response.body;
                  Joi.validate(stat, statsValidationErrorSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.lastMileRtt
        .getQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecWithoutAuthCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });

      StatsDDHelper.lastMileRtt
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('TOP: Error Response Data Schema,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return domain\'s stats applying `error response` ' +
          'schema when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecWithoutAuthCallback = function (queryData) {
        return function (done) {
          API.session.reset();
          API.resources.stats
            .top()
            .getOne(domainConfig.id, queryData)
            .expect(401)
            .then(function (response) {
              var stat = response.body;
              Joi.validate(stat, statsErrorSchema, done);
            })
            .catch(done);
        };
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .top()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (response) {
                  var stat = response.body;
                  Joi.validate(stat, statsValidationErrorSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.top
        .getQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecWithoutAuthCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });

      StatsDDHelper.top
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('TOP Objects: Error Response Data Schema,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return domain\'s stats applying `error response` ' +
          'schema when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecWithoutAuthCallback = function (queryData) {
        return function (done) {
          API.session.reset();
          API.resources.stats
            .topObjects()
            .getOne(domainConfig.id, queryData)
            .expect(401)
            .then(function (response) {
              var stat = response.body;
              Joi.validate(stat, statsErrorSchema, done);
            })
            .catch(done);
        };
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .topObjects()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (response) {
                  var stat = response.body;
                  Joi.validate(stat, statsValidationErrorSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.topObjects
        .getQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecWithoutAuthCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });

      StatsDDHelper.topObjects
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });
  });
});