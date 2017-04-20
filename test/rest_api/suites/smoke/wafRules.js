/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

// # Smoke check: WAF Rules
var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var WAFRulesDataProvider = require('./../../common/providers/data/wafRules');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  // Shared variables
  var wafRule;
  var accountId;

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var user = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.helpers.wafRules.createOne();
      })
      .then(function (dataWAFRule) {
        wafRule = dataWAFRule;
        accountId = wafRule.account_id;
        done();
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('WAF Rules resource', function () {

    it('should return a success response when getting all WAF Rules',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.wafRules
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting specific WAF Rule',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.wafRules
              .getOne(wafRule.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when creating specific WAF Rule',
      function (done) {
        var newWAFRule = WAFRulesDataProvider.generateOne({
          accountId: accountId
        });
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.wafRules
              .createOne(newWAFRule)
              .expect(200)
              .then(function (resp) {
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return a success response when updating specific WAF Rule',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.wafRules.createOneForAccount({
              id: accountId
            });
          })
          .then(function (wafRule) {
            var wafRuleId = wafRule.id;
            wafRule.rule_name = wafRule.rule_name + '-UPDATED';
            delete wafRule.id;
            API.resources.wafRules
              .update(wafRuleId, wafRule)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when deleting an WAF Rule',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.wafRules.createOneForAccount({
              id: accountId
            });
          })
          .then(function (wafRule) {
            API.resources.wafRules
              .deleteOne(wafRule.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

  });
});
