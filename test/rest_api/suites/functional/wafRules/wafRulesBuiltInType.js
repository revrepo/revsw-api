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

require('should-http');

var config = require('config');
var _ = require('lodash');
var API = require('./../../../common/api');
describe('Functional check', function () {
  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  describe('WAF Rules resource with Built-In type', function () {
    var userRevAdmin = config.get('api.users.revAdmin');
    var accountData;
    var WAFRuleBuiltInAndHidden = {
      rule_type: 'builtin',
      visibility: 'hidden'
    };
    var WAFRuleBuiltInAndPublic = {
      rule_type: 'builtin',
      visibility: 'public'
    };

    before(function (done) {
      API.helpers.authenticateUser(userRevAdmin)
        .then(function () {
          return API.helpers.accounts.createOne()
            .then(function (dataAccount) {
              accountData = dataAccount;
              return API.helpers.wafRules.createCustomForAccount(dataAccount, WAFRuleBuiltInAndPublic)
                .then(function (dataWAFRule) {
                  _.extend(WAFRuleBuiltInAndPublic, dataWAFRule);
                  return dataAccount;
                });
            })
            .then(function (dataAccount) {
              return API.helpers.wafRules.createCustomForAccount(dataAccount, WAFRuleBuiltInAndHidden)
                .then(function (dataWAFRule) {
                  _.extend(WAFRuleBuiltInAndHidden, dataWAFRule);
                  return;
                });
            });
        })
        .then(function () {
          done();
        })
        .catch(done);
    });

    describe('Access for different users', function () {
      var users = [
        config.get('api.users.admin'),
        config.get('api.users.revAdmin'),
        config.get('api.users.reseller'),
        config.get('api.users.user')
      ];
      users.forEach(function (user) {
        it('should have access to Public Biult-In WAF Rule for user with role  ' + user.role, function (done) {
          API.resources.wafRules
            .getOne(WAFRuleBuiltInAndPublic.id)
            .expect(200)
            .then(function (response) {
              response.body.id.should.equal(WAFRuleBuiltInAndPublic.id);
              response.body.account_id.should.equal(accountData.id);
              return;
            })
            .then(function () {
              done();
            })
            .catch(done);
        });

        it('should have access to Hidden Biult-In WAF Rule for user with role ' + user.role, function (done) {

          API.resources.wafRules
            .getOne(WAFRuleBuiltInAndHidden.id)
            .expect(200)
            .then(function (response) {
              response.body.id.should.equal(WAFRuleBuiltInAndHidden.id);
              response.body.account_id.should.equal(accountData.id);
              return;
            })
            .then(function () {
              done();
            })
            .catch(done);
        });
      });
    });
  });
});
