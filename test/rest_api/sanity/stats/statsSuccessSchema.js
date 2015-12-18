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
var API = require('./../../common/api');
var Utils = require('./../../common/utils');
var DomainConfigsDP = require('./../../common/providers/data/domainConfigs');
var StatRespSP = require('./../../common/providers/schema/statsResponse');
var StatsDP = require('./../../common/providers/data/stats');
var StatsDDHelper = StatsDP.DataDrivenHelper;

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var reseller = config.get('api.users.reseller');
  var statSchema = StatRespSP.getStat();

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
      .then(function (domainConfig) {
        firstDc = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.resources.domainConfigs.deleteOne(firstDc.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Stats resource', function () {
    parallel('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      var getSpecDescription = function (queryData) {
        return 'should return domain\'s stats applying stats schema when ' +
          'using: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.stats
                .getOne(firstDc.id, queryData)
                .expect(200)
                .then(function (response) {
                  var stat = response.body;
                  Joi.validate(stat, statSchema, done);
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
          var specCallback = getSpecCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });

      StatsDDHelper
        .getCombinedQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecCallback(queryParams);
          /** Running spec with a set of combined query params */
          it(specDescription, specCallback);
        });
    });
  });
});