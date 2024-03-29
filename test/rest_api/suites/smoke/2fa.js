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
var DataProvider = require('./../../common/providers/data');
var HelpersAPI = require('./../../common/helpers/api');
var TwoFADP = require('./../../common/providers/data/2fa');

describe('Smoke check:', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));
  
  var userRolesList = [
    'user',
    'admin',
    'reseller'
  ];

  var users = [
    config.get('api.users.reseller'),
    config.get('api.users.revAdmin'),
    config.get('api.apikeys.reseller')
  ];

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  users.forEach(function (user) {
    describe('With ' + user.role, function () {
      userRolesList.forEach(function (role) {
        describe('2fa resource for user with role "' + role + '"', function () {
          var testUser, accountForUsers;
          before(function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                if (user.key) {
                  return user.account;
                } else {
                  return HelpersAPI.accounts.createCompleteOne();
                }
              })
              .then(function (newAccount) {
                accountForUsers = newAccount;
              })
              .then(done)
              .catch(done);
          });

          beforeEach(function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                var newUser = DataProvider.generateUser(role);
                newUser.account_id = role === 'reseller' ? user.account.id : accountForUsers.id;
                newUser.domain = [];
                return API.helpers.users.create(newUser);
              })
              .then(function (newUser) {
                testUser = newUser;
              })
              .then(done)
              .catch(done);
          });

          afterEach(function (done) {
            done();
          });

          it('should return success response when initializing 2fa for specific user',
            function (done) {
              API.helpers
                .authenticateUser(testUser)
                .then(function () {
                  API.resources.twoFA
                    .init()
                    .getOne()
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });

          it('should return success response when enabling 2fa for specific user',
            function (done) {
              API.helpers
                .authenticateUser(testUser)
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
                        .end(done);
                    })
                    .catch(function (err) {
                      throw new Error(err);
                      done();
                    });
                })
                .catch(done);
            });

          it('should return success response when authenticating with a valid OTP',
            function (done) {
              API.helpers
                .authenticateUser(testUser)
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
                          API.resources.twoFA
                            .init()
                            .getOne()
                            .expect(200)
                            .then(function (res) {
                              var key = res.body.base32;
                              return TwoFADP.generateOneTimePassword(key);
                            })
                            .then(function (otp) {
                              user.oneTimePassword = otp.oneTimePassword;
                              API.helpers
                                .authenticateUser(testUser)
                                .then(function () {
                                  done();
                                })
                                .catch(function (err) {
                                  throw new Error(err);
                                  done();
                                });
                            })
                            .catch(function (err) {
                              throw new Error(err);
                              done();
                            });
                        });
                    })
                    .catch(function (err) {
                      throw new Error(err);
                      done();
                    });
                })
                .catch(done);
            });

          it('should return success response when disabling 2fa for specific user',
            function (done) {
              API.helpers
                .authenticateUser(testUser)
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
                          API.resources.twoFA
                            .disable()
                            .createOne(testUser.id)
                            .expect(200)
                            .end(done);
                        })
                        .catch(function (err) {
                          throw new Error(err);
                          done();
                        });
                    })
                    .catch(function (err) {
                      throw new Error(err);
                      done();
                    });
                })
                .catch(done);
            });
        });
      });
    });
  });
});
