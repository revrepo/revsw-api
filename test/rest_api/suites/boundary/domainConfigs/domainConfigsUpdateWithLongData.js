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

var config = require('config');
var API= require('./../../../common/api');
var dcSchema= require('./../../../common/providers/schema/json/domainConfigs.json');
var AccountsDP= require('./../../../common/providers/data/accounts');
var DomainConfigsDP= require('./../../../common/providers/data/domainConfigs');

describe('Boundary check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var fullDomainConfig = DomainConfigsDP.generateFull('INVALID-ID');
  var reseller = config.get('api.users.reseller');

  /**
   * Based on `data` from DataDriven case, generates callback for mocha test
   * to execute.
   *
   * @param {object} ddCase, specific data driven case
   * @returns {Function}, callback for mocha test
   */
  var getLongDataCheckCallBack = function (ddCase) {
    return function (done) {
      var clonedDc = DomainConfigsDP.cloneForUpdate(fullDomainConfig);
      var dcId = clonedDc.id;
      delete clonedDc.id;
      DomainConfigsDP.DataDrivenHelper
        .setValueByPath(clonedDc, ddCase.propertyPath, ddCase.testValue);
      API.helpers
        .authenticateUser(reseller)
        .then(function () {
          API.resources.domainConfigs
            .update(dcId, clonedDc)
            .expect(400)
            .then(function (res) {
              ddCase.propertyPath.split('.').forEach(function (key) {
                if (key === '0') {
                  res.body.message.should.containEql('position 0');
                }
                else {
                  res.body.message.should.containEql('"' + key + '" fails');
                }
              });
              done();
            })
            .catch(done);
        })
        .catch(done);
    };
  };

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
        fullDomainConfig.id = domainConfig.id;
        fullDomainConfig.account_id = account.id;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        API.resources.domainConfigs.deleteOne(domainConfig.id);
        done();
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {
    describe('Update with long data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      for (var key in dcSchema) {
        if (!dcSchema.hasOwnProperty(key)) {
          continue;
        }
        var ddCase = DomainConfigsDP.DataDrivenHelper
          .generateLongData(key, dcSchema[key]);
        var propertyValue = DomainConfigsDP.DataDrivenHelper
          .getValueByPath(fullDomainConfig, key);
        if (ddCase.testValue === undefined || propertyValue === undefined) {
          continue;
        }
        if (ddCase.skipReason) {
          // Setting test as pending as there is a reason (usually a BUG)
          xit(ddCase.spec, getLongDataCheckCallBack(ddCase));
        }
        else {
          // Running the test for specific DataDriven case
          it(ddCase.spec, getLongDataCheckCallBack(ddCase));
        }
      }
    });
  });
});
