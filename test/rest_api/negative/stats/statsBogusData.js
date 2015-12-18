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
var StatsDP = require('./../../common/providers/data/stats');
var StatsDDHelper = StatsDP.DataDrivenHelper;

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');

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

  describe('Stats resource', function () {
    parallel('With bogus data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      var getSpecDescription = function (queryData) {
        return 'should return bad request when trying get domain\'s stats ' +
          'with `bogus` data like: ' + Utils.getJsonAsKeyValueString(queryData);
      };

      var getSpecBogusDataCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(reseller)
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
        .getBogusQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecBogusDataCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });
  });
});