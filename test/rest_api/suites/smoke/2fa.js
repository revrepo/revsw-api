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
var TwoFADP = require('./../../common/providers/data/2fa');

describe('Smoke check:', function() {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var usersList = [
    config.api.users.revAdmin,
    config.api.users.reseller,
    config.api.users.admin,
    // API Key
    config.api.apikeys.admin,
    config.api.apikeys.reseller
  ];

  before(function(done) {
    done();
  });

  after(function(done) {
    done();
  });

  usersList.forEach(function(credentials) {
    describe('2fa resource for credential data ' + credentials.role, function() {
      var user;
      beforeEach(function(done) {
        API.helpers
          .authenticate(credentials)
          .then(function() {
            var newUser = DataProvider.generateUser();
            if (credentials.role === config.api.users.revAdmin.role) {
              newUser.companyId = [credentials.account.id];
              newUser.domain = [];
            }
            return API.helpers.users.create(newUser);
          })
          .then(function(newUser) {
            user = newUser;
          })
          .then(done)
          .catch(done);
      });

      afterEach(function(done) {
        done();
      });

      it('should return success response when initializing 2fa for specific user',
        function(done) {
          API.helpers
            .authenticateUser(user)
            .then(function() {
              API.resources.twoFA
                .init()
                .getOne()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return success response when enabling 2fa for specific user',
        function(done) {
          API.helpers
            .authenticateUser(user)
            .then(function() {
              API.resources.twoFA
                .init()
                .getOne()
                .expect(200)
                .then(function(res) {
                  var key = res.body.base32;
                  var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                  API.resources.twoFA
                    .enable()
                    .createOne(oneTimePassword)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return success response when disabling 2fa for specific user',
        function(done) {
          API.helpers
            .authenticateUser(user)
            .then(function() {
              API.resources.twoFA
                .init()
                .getOne()
                .expect(200)
                .then(function(res) {
                  var key = res.body.base32;
                  var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                  API.resources.twoFA
                    .enable()
                    .createOne(oneTimePassword)
                    .expect(200)
                    .then(function() {
                      API.resources.twoFA
                        .disable()
                        .createOne(user.id)
                        .expect(200)
                        .end(done);
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
