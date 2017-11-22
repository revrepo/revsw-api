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
var API = require('./../../../common/api');
var purgeSchema = require('./../../../common/providers/schema/json/purge.json');
var AccountsDP = require('./../../../common/providers/data/accounts');
var PurgeDP = require('./../../../common/providers/data/purge');
var Utils = require('./../../../common/utils');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');

  /**
   * Based on `data` from DataDriven case, generates callback for mocha test
   * to execute.
   *
   * @param {object} ddCase, specific data driven case
   * @returns {Function}, callback for mocha test
   */
  var getWithoutRequiredDataCheckCallBack = function (ddCase) {
    return function (done) {
      var purgeData = PurgeDP.generateOne(domainConfig.domain_name);
      Utils.removeValueByPath(purgeData, ddCase.propertyPath);
      API.identity
        .authenticate(reseller)
        .then(function () {
          API.resources.purge
            .createOne(purgeData)
            .expect(400)
            .then(function (res) {
              ddCase.propertyPath.split('.').forEach(function (key) {
                //console.log('res.body.message:', res.body.message);
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

  describe('Purge resource', function () {

    it('should return `Bad Request` response when not providing a query parameters',
      function(done) {
        API.identity
          .authenticate(reseller)
          .then(function() {
            API.resources.purge
              .getAll({})
              .expect(400)
              .then(function(res) {
                res.body.error.should.equal('Bad Request');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    describe('Create without required data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      for (var key in purgeSchema) {
        if (!purgeSchema.hasOwnProperty(key)) {
          continue;
        }
        var ddCase = PurgeDP.DataDrivenHelper
          .generateWithoutRequiredData(key, purgeSchema[key]);
        var purgeData = PurgeDP.generateOne('DOMAIN_NAME');

        var propertyValue = Utils.getValueByPath(purgeData, key);
        if (ddCase.isRequired === false || propertyValue === undefined) {
          continue;
        }
        if (ddCase.skipReason) {
          // Setting test as pending as there is a reason (usually a BUG)
          xit(ddCase.spec, getWithoutRequiredDataCheckCallBack(ddCase));
        }
        else {
          // Running the test for specific DataDriven case
          it(ddCase.spec, getWithoutRequiredDataCheckCallBack(ddCase));
        }
      }
    });
  });
});
