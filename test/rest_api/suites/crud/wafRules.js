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

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user')
  ];

  users.forEach(function (user) {

    describe('With user: ' + user.role, function () {
      var testAccount;
      var testWAFRule;
      describe('WAF Rules resource', function () {
        /**
         * Prepare Account Data and New WAF Rule
         */
        before(function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              // Admin
              if (user === config.get('api.users.admin') ||
                user === config.get('api.users.user')) {
                return API.resources.users
                  .myself()
                  .getOne()
                  .expect(200)
                  .then(function (res) {
                    return {
                      'id': res.body.companyId[0]
                    };
                  })
                  .catch(done);
              }
              return API.helpers.accounts.createOne();
            })
            .then(function (newAccount) {
              testAccount = newAccount;
              return API.helpers.wafRules.createOneForAccount(testAccount);
            })
            .then(function (dataWAFRule) {
              testWAFRule = dataWAFRule;
            })
            .then(done)
            .catch(done);
        });


        after(function (done) {
          API.resources.wafRules.deleteOne(testWAFRule.id);
          done();
        });

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

        it('should allow to get all WAF Rules',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.wafRules
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var dataList = response.body;
                    dataList.should.not.be.empty();
                    dataList.length.should.greaterThan(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get exists WAF Rule',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.wafRules
                  .getOne(testWAFRule.id)
                  .expect(200)
                  .then(function (response) {
                    var dataItem = response.body;
                    dataItem.id.should.equal(testWAFRule.id);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to create an Customer WAF Rule',
          function (done) {
            var params = {
              accountId: testAccount.id,
              ruleType: 'customer'
            };
            var newWAFRule = API.providers.data.wafRules.generateOne(params);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.wafRules
                  .createOne(newWAFRule)
                  .expect(200)
                  .then(function (response) {
                    var newWAFRule = response.body;
                    newWAFRule.statusCode.should.equal(200);
                    newWAFRule.id.should.not.be.empty();
                    // Delete WAR Rule
                    API.resources.wafRules
                      .deleteOne(newWAFRule.object_id)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to update an WAF Rule',
          function (done) {
            var newWAFRule = API.providers.data.wafRules.generateOne({
              accountId: testAccount.id
            });
            var updatedWAFRule = API.providers.data.wafRules.generateOneForUpdate({
              accountId: testAccount.id
            }, 'UPDATE');
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.wafRules.createOne(newWAFRule);
              })
              .then(function (response) {
                API.resources.wafRules
                  .update(response.body.id, updatedWAFRule)
                  .expect(200)
                  .then(function (response) {
                    var dataUpdateResult = response.body;
                    dataUpdateResult.statusCode.should.equal(202);
                    dataUpdateResult.message.should.equal('Successfully saved the updated WAF rule');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to delete an WAF Rule',
          function (done) {
            var newWAFRule = API.providers.data.wafRules.generateOne({
              accountId: testAccount.id
            });
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.wafRules.createOne(newWAFRule);
              })
              .then(function (response) {
                API.resources.wafRules
                  .deleteOne(response.body.id)
                  .expect(200)
                  .then(function (response) {
                    var dataResultResponse = response.body;
                    dataResultResponse.statusCode.should.equal(202);
                    dataResultResponse.message.should.equal('The WAF rule has been scheduled for removal');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });
        //
      });
    });

  });
});
