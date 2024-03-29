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
var API = require('./../../common/api');
var TwoFADP = require('./../../common/providers/data/2fa');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user;
  var reseller = config.get('api.users.reseller');
  var secondReseller = config.get('api.users.secondReseller');
  var normalUser = config.get('api.users.user');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('2fa resource', function () {

    beforeEach(function (done) {
      API.helpers
        .authenticateUser(reseller)
        .then(function () {
          return API.helpers.users.create({
            firstName: 'Tom',
            lastName: 'Smith',
            account_id: reseller.account.id
          });
        })
        .then(function (newUser) {
          user = newUser;
        })
        .then(done)
        .catch(done);
    });

    afterEach(function (done) {
      done();
    });

    it('should fail to enable 2fa for user before calling init',
      function (done) {
        var oneTimePassword = TwoFADP.generateOneTimePassword('none');
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .enable()
              .createOne(oneTimePassword)
              .expect(400)
              .then(function (res) {
                var expectedMessage = 'Must call init first';
                res.body.message.should.equal(expectedMessage);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should fail to enable 2fa for user with wrong oneTimePassword',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function () {
                var oneTimePassword = TwoFADP.generateOneTimePassword('none');
                API.resources.twoFA
                  .enable()
                  .createOne(oneTimePassword)
                  .expect(400)
                  .then(function (res) {
                    var expMsg = 'The supplied one time password is incorrect';
                    res.body.message.should.equal(expMsg);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should fail to disable 2FA for another user',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function (res) {
                var key = res.body.base32;
                var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                API.resources.twoFA
                  .enable()
                  .createOne(oneTimePassword)
                  .expect(200)
                  .then(function () {
                    API.helpers
                      .authenticateUser(normalUser)
                      .then(function () {
                        API.resources.twoFA
                          .disable()
                          .createOne(user.id)
                          .expect(400)
                          .then(function (response) {
                            var expMsg = 'User ID not found';
                            response.body.message.should.equal(expMsg);
                            done();
                          })
                          .catch(done);
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should fail to disable 2FA for an existing user from another account',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function (res) {
                var key = res.body.base32;
                var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                API.resources.twoFA
                  .enable()
                  .createOne(oneTimePassword)
                  .expect(200)
                  .then(function () {
                    API.helpers
                      .authenticateUser(secondReseller)
                      .then(function () {
                        API.resources.twoFA
                          .disable()
                          .createOne(user.id)
                          .expect(400)
                          .then(function (response) {
                            var expMsg = 'User ID not found';
                            response.body.message.should.equal(expMsg);
                            done();
                          })
                          .catch(done);
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
  // NOTE: tests for API Keys
  describe('2fa resource and API Keys', function() {
    var accountSample, apiKeyAccountSample;
    var userSample;

    before(function(done) {
      API.helpers
        .authenticateUser(reseller)
        .then(function() {
         return  API.helpers.accounts.createOne()
           .then(function(newAccount) {
              accountSample = newAccount;
           });
        })
        .then(function(){
          return API.helpers.apiKeys
                .createOneForAccount(accountSample)
                .then(function(apiKey) {
                  apiKeyAccountSample = apiKey;
                });
        })
        .then(function(){
          done();
        })
        .catch(done);
    });

    after(function(done) {
      API.resources.accounts
        .deleteOne(accountSample.id)
        .then(function(){
          done();
        })
        .catch(done);
    });

    it('should fail to init 2FA if authenticate by API Key', function(done){
      API.helpers
        .authenticateAPIKey(apiKeyAccountSample.id)
        .then(function() {
          API.resources.twoFA
            .init()
            .getOne()
            .expect(403)
            .end(done);
        })
        .catch(done);
    });

  });
});
