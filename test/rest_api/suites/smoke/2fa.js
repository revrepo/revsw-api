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
  var revAdminCredentials = config.api.users.revAdmin;

  var userRolesList = [
    'user',
    'admin',
    'reseller'
  ];

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  userRolesList.forEach(function (roleName) {
    describe('2fa resource for user with role "' + roleName + '"', function () {
      var user, accountForUsers;
      before(function (done) {
        API.helpers
          .authenticate(revAdminCredentials)
          .then(function () {
            return HelpersAPI.accounts.createCompleteOne();
          })
          .then(function (newAccount) {
            accountForUsers = newAccount;
          })
          .then(done)
          .catch(done);
      });

      beforeEach(function (done) {
        API.helpers
          .authenticate(revAdminCredentials)
          .then(function () {
            var newUser = DataProvider.generateUser(roleName);
            newUser.companyId = [accountForUsers.id];
            newUser.domain = [];
            return API.helpers.users.create(newUser);
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

      it('should return success response when initializing 2fa for specific user',
        function (done) {
          API.helpers
            .authenticateUser(user)
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
                            .authenticateUser(user)
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
                      API.resources.twoFA
                        .disable()
                        .createOne(user.id)
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
