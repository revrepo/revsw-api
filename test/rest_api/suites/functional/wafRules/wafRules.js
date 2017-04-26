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
describe('Functional check', function () {
  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  describe('WAF Rules resource', function () {

    describe('Access to WAF Rule data for users form different accounts', function () {
      var userRevAdmin = config.get('api.users.revAdmin');
      var firstAccount, seccondAccount;
      var firstUser, seccondUser;
      var firstWAFRule, seccondWAFRule;
      before(function (done) {
        // Prepare data for
        API.helpers.authenticateUser(userRevAdmin)
          .then(function () {
            return API.helpers.accounts.createOne()
              .then(function (dataAccount) {
                firstAccount = dataAccount;
                return API.helpers.users.create({
                    companyId: [firstAccount.id + '']
                  })
                  .then(function (dataUser) {
                    firstUser = dataUser;
                    return API.helpers.wafRules.createOneForAccount(firstAccount)
                      .then(function (dataWAFRule) {
                        firstWAFRule = dataWAFRule;
                        return;
                      });
                  });
              })
              .then(function () {
                return API.helpers.accounts.createOne()
                  .then(function (dataAccount) {
                    seccondAccount = dataAccount;
                    return API.helpers.users.create({
                        companyId: [seccondAccount.id + '']
                      })
                      .then(function (dataUser) {
                        seccondUser = dataUser;
                        return API.helpers.wafRules.createOneForAccount(seccondAccount)
                          .then(function (dataWAFRule) {
                            seccondWAFRule = dataWAFRule;
                            return;
                          });
                      });
                  });
              });
          })
          .then(function () {
            done();
          })
          .catch(done);

      });

      after(function (done) {
        // TODO: clear data from DB ??
        done();
      });

      it('should have access to WAF Rule for user with same account', function (done) {
        API.helpers.authenticateUser(firstUser)
          .then(function () {
            return API.resources.wafRules
              .getOne(firstWAFRule.id)
              .expect(200)
              .then(function (response) {
                response.body.id.should.equal(firstWAFRule.id);
                response.body.account_id.should.equal(firstAccount.id);
                return;
              });
          })
          .then(function () {
            done();
          })
          .catch(done);
      });

      it('should have no access to WAF Rules for users from different accounts', function (done) {
        API.helpers.authenticateUser(firstUser)
          .then(function (data) {
            return API.resources.wafRules
              .getOne(seccondWAFRule.id)
              .expect(400)
              .then(function (response) {
                response.body.message.should.equal('WAF Rule ID not found');
                return;
              });
          })
          .then(function () {
            return API.helpers.authenticateUser(seccondUser)
              .then(function () {
                return API.resources.wafRules
                  .getOne(firstWAFRule.id)
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('WAF Rule ID not found');
                    return;
                  });
              });
          })
          .then(function () {
            done();
          })
          .catch(done);
      });

    });
  });
});
