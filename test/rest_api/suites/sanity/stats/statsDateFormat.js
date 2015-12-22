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

describe('Sanity check.', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');
  var expectedDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  var maxTimestamp = 9999999999999;

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
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Stats resource.', function () {
    parallel('Date format,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return date|time fields in expected `Date|Time format`' +
          'when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecDateFormatCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .getOne(domainConfig.id, queryData)
                .expect(200)
                .then(function (response) {
                  var metadata = response.body.metadata;
                  metadata.start_datetime.should.match(expectedDateFormat);
                  metadata.end_datetime.should.match(expectedDateFormat);
                  metadata.start_timestamp.should.be.belowOrEqual(maxTimestamp);
                  metadata.end_timestamp.should.be.belowOrEqual(maxTimestamp);
                  done();
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
          var specCallback = getSpecDateFormatCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('GBT: Date format,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return date|time fields in expected `Date|Time format`' +
          'when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecDateFormatCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .gbt()
                .getOne(domainConfig.id, queryData)
                .expect(200)
                .then(function (response) {
                  var metadata = response.body.metadata;
                  metadata.start_datetime.should.match(expectedDateFormat);
                  metadata.end_datetime.should.match(expectedDateFormat);
                  metadata.start_timestamp.should.be.belowOrEqual(maxTimestamp);
                  metadata.end_timestamp.should.be.belowOrEqual(maxTimestamp);
                  done();
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
          var specCallback = getSpecDateFormatCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('Last Mile RTT: Date format,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return date|time fields in expected `Date|Time format`' +
          'when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecDateFormatCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .lastMileRtt()
                .getOne(domainConfig.id, queryData)
                .expect(200)
                .then(function (response) {
                  var metadata = response.body.metadata;
                  metadata.start_datetime.should.match(expectedDateFormat);
                  metadata.end_datetime.should.match(expectedDateFormat);
                  metadata.start_timestamp.should.be.belowOrEqual(maxTimestamp);
                  metadata.end_timestamp.should.be.belowOrEqual(maxTimestamp);
                  done();
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
          var specCallback = getSpecDateFormatCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('TOP: Date format,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return date|time fields in expected `Date|Time format`' +
          'when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecDateFormatCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .top()
                .getOne(domainConfig.id, queryData)
                .expect(200)
                .then(function (response) {
                  var metadata = response.body.metadata;
                  metadata.start_datetime.should.match(expectedDateFormat);
                  metadata.end_datetime.should.match(expectedDateFormat);
                  metadata.start_timestamp.should.be.belowOrEqual(maxTimestamp);
                  metadata.end_timestamp.should.be.belowOrEqual(maxTimestamp);
                  done();
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
          var specCallback = getSpecDateFormatCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    parallel('TOP Objects: Date format,', function () {

      var getSpecDescription = function (queryData) {
        return 'should return date|time fields in expected `Date|Time format`' +
          'when using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecDateFormatCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .topObjects()
                .getOne(domainConfig.id, queryData)
                .expect(200)
                .then(function (response) {
                  var metadata = response.body.metadata;
                  metadata.start_datetime.should.match(expectedDateFormat);
                  metadata.end_datetime.should.match(expectedDateFormat);
                  metadata.start_timestamp.should.be.belowOrEqual(maxTimestamp);
                  metadata.end_timestamp.should.be.belowOrEqual(maxTimestamp);
                  done();
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
          var specCallback = getSpecDateFormatCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });
  });
});