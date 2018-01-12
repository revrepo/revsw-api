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

var config = require('config');
var API = require('./../../common/api');
var Utils = require('./../../common/utils');
var ActivityDP = require('./../../common/providers/data/activity');
var ActivityDDHelper = ActivityDP.DataDrivenHelper;

describe('Smoke check', function () {

  var user = config.get('api.users.reseller');
  var apiKey = config.get('api.apikeys.admin');
  var apiKeyReseller = config.get('api.apikeys.reseller');

  [user, apiKey, apiKeyReseller].forEach(function (val) {
    describe('With ' + val.role, function () {
      // Changing default mocha's timeout (Default is 2 seconds).
      this.timeout(config.get('api.request.maxTimeout'));

      var account;
      var domainConfig;

      before(function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.resources.users
              .myself()
              .getOne()
              .then(function (response) {
                user.id = response.body.user_id;
              })
              .catch(done);
          })
          .then(function () {
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            account = newAccount;
            return API.helpers.domainConfigs.createOne(account.id);
          })
          .then(function (newDomainConfig) {
            domainConfig = newDomainConfig;
            var data = {
              userId: user.id,
              domainId: domainConfig.id,
              companyId: account.id
            };
            ActivityDDHelper.setQueryParams(data);
            ActivityDDHelper.summary.setQueryParams(data);
          })
          .then(done)
          .catch(done);
      });

      after(function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.domainConfigs.deleteOne(domainConfig.id);
            done();
          })
          .catch(done);
      });

      describe('Activity resource', function () {

        var getSpecDescription = function (queryData) {
          var queryString = Utils.getJsonKeysAsString(queryData);
          return 'should return success response' +
            (queryString === '' ? '' : ' when using: ' + queryString);
        };

        var getSpecCallback = function (index) {
          return function (done) {
            var queryData = ActivityDDHelper.getQueryParams()[index];
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.activity
                  .getAll(queryData)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          };
        };

        ActivityDDHelper
          .getQueryParams()
          .forEach(function (queryParams, index) {
            var specDescription = getSpecDescription(queryParams);
            var specCallback = getSpecCallback(index);
            /** Running spec for each query params */
            it(specDescription, specCallback);
          });
      });

      xdescribe('Summary: Activity resource', function () {

        var getSpecDescription = function (queryData) {
          var queryString = Utils.getJsonKeysAsString(queryData);
          return 'should return success response' +
            (queryString === '' ? '' : ' when using: ' + queryString);
        };

        var getSpecCallback = function (index) {
          return function (done) {
            var queryData = ActivityDDHelper.getQueryParams()[index];
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.activity
                  .summary()
                  .getAll(queryData)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          };
        };

        ActivityDDHelper.summary
          .getQueryParams()
          .forEach(function (queryParams, index) {
            var specDescription = getSpecDescription(queryParams);
            var specCallback = getSpecCallback(index);
            /** Running spec for each query params */
            it(specDescription, specCallback);
          });
      });
    });
  });
});
