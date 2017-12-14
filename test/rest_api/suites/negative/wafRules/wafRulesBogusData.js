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
var API = require('./../../../common/api');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));
  var userRevAdmin = config.get('api.users.revAdmin');
  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user')
  ];

  users.forEach(function (user) {

    describe('With user: ' + user.role, function () {
      describe('WAF Rules resource', function () {

        describe('Create with bogus data', function () {
          var testWAFRule;
          var bogusWAFRuleData = {
            ruleName: 'asdf@e34a\˜@$0-=+!',
            ruleType: 'qazwsx1234!@#$%ˆ&*( ',
            accountId: user.account.id,
            comment: 'QA WAF Rule Bogus Test Data'
          };

          before(function (done) {
            testWAFRule = API.providers.data.wafRules.generateOne(bogusWAFRuleData);
            done();
          });
          it('should return `Bad Request` when trying to `create` WAF Rule ' +
            'with `bogus` Rule Name',
            function (done) {
              API.identity
                .authenticate(user)
                .then(function () {
                  var bodusWAFRule = API.providers.data.wafRules.generateOne({
                    accountId: user.account.id
                  });
                  bodusWAFRule.rule_name = bogusWAFRuleData.ruleName;
                  API.resources.wafRules
                    .createOne(bodusWAFRule)
                    .expect(400)
                    .then(function (res) {
                      res.body.message.should.containEql('"rule_name" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

        });

        describe('Bogus Data', function () {

          var bogusId = '!@#$%^&*()_+';

          before(function (done) {
            done();
          });

          after(function (done) {
            done();
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return `bad request` response when getting WAF Rule using ' +
            'bogus id',
            function (done) {
              API.identity
                .authenticate(user)
                .then(function () {
                  API.resources.wafRules
                    .getOne(bogusId)
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"waf_rule_id" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

          it('should return `bad request` response when deleting WAF Rule using ' +
            'bogus id.',
            function (done) {
              API.identity
                .authenticate(user)
                .then(function () {
                  API.resources.wafRules
                    .deleteOne(bogusId)
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"waf_rule_id" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

          it('should return `bad request` response when getting config ' +
            'status for WAF Rule using bogus id',
            function (done) {
              API.identity
                .authenticate(user)
                .then(function () {
                  API.resources.wafRules
                    .status(bogusId)
                    .getOne()
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"waf_rule_id" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

        });
      });
    });
  });
});
