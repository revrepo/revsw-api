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
var StatsDP= require('./../../../common/providers/data/stats');
var StatsDDHelper = StatsDP.DataDrivenHelper;

describe('Negative check.', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    API.identity
      .authenticate(reseller)
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
    API.identity
      .authenticate(reseller)
      .then(function () {
        API.resources.domainConfigs.deleteOne(domainConfig.id);
        done();
      })
      .catch(done);
  });

  describe('Stats resource.', function () {
    parallel('With invalid data,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return bad request when trying get domain\'s stats ' +
          'with `invalid` data like: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.stats
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (res) {
                  var key = Object.keys(queryData)[0];
                  if (key === 'from_timestamp' || key === 'to_timestamp') {
                    var expMsg = 'Cannot parse the ' + key + ' value';
                    res.body.message.should.equal(expMsg);
                    return done();
                  }
                  res.body.message.should.containEql('"' + key + '" fails');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('GBT: With invalid data,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return bad request when trying get domain\'s stats ' +
          'with `invalid` data like: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.stats
                .gbt()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (res) {
                  var key = Object.keys(queryData)[0];
                  if (key === 'from_timestamp' || key === 'to_timestamp') {
                    var expMsg = 'Cannot parse the ' + key + ' value';
                    res.body.message.should.equal(expMsg);
                    return done();
                  }
                  res.body.message.should.containEql('"' + key + '" fails');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.gbt
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('Last Mile RTT: With invalid data,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return bad request when trying get domain\'s stats ' +
          'with `invalid` data like: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.stats
                .lastMileRtt()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (res) {
                  var key = Object.keys(queryData)[0];
                  if (key === 'from_timestamp' || key === 'to_timestamp') {
                    var expMsg = 'Cannot parse the ' + key + ' value';
                    res.body.message.should.equal(expMsg);
                    return done();
                  }
                  res.body.message.should.containEql('"' + key + '" fails');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.lastMileRtt
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('TOP: With invalid data,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return bad request when trying get domain\'s stats ' +
          'with `invalid` data like: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.stats
                .top()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (res) {
                  var key = Object.keys(queryData);
                  if (key.length > 1) {
                    // Removing report_type as it is not relevant to validation
                    delete queryData.report_type;
                    key = Object.keys(queryData)[0];
                  }
                  if (key === 'from_timestamp' || key === 'to_timestamp') {
                    var expMsg = 'Cannot parse the ' + key + ' value';
                    res.body.message.should.equal(expMsg);
                    return done();
                  }
                  res.body.message.should.containEql('"' + key + '" fails');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      StatsDDHelper.top
        .getInvalidQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecInvalidDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('TOP Objects: With invalid data,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return bad request when trying get domain\'s stats ' +
          'with `invalid` data like: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecInvalidDataCallback = function (queryData) {
        return function (done) {
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.stats
                .topObjects()
                .getOne(domainConfig.id, queryData)
                .expect(400)
                .then(function (res) {
                  var key = Object.keys(queryData)[0];
                  if (key === 'from_timestamp' || key === 'to_timestamp') {
                    var expMsg = 'Cannot parse the ' + key + ' value';
                    res.body.message.should.equal(expMsg);
                    return done();
                  }
                  res.body.message.should.containEql('"' + key + '" fails');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

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
