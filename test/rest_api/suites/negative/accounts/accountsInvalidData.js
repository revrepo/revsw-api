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

var config = require('config');
var accounts = require('./../../../common/resources/accounts');
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var resellerUser = config.get('api.users.reseller');
  var revAdmin = config.get('api.users.revAdmin');
  
  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Accounts resource', function () {
    describe('With invalid data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` response when getting specific account.',
        function (done) {
          var invalidId = 'invalid-account-id';
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getOne(invalidId)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when creating specific account',
        function (done) {
          var invalidAccount = {
            invalidKey: 'Invalid information'
          };
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .createOne(invalidAccount)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when updating specific account',
        function (done) {
          var invalidId = 'invalid-account-id';
          var invalidUpdatedAccount = {
            invalidKey: 'Invalid information'
          };
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .update(invalidId, invalidUpdatedAccount)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when deleting an account.',
        function (done) {
          var invalidId = 'invalid-account-id';
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .deleteOne(invalidId)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when creating an account using an API Key.',
        function (done) {
          var apiKey;
          API.helpers.authenticateUser(resellerUser)
            .then(function () {
              API.helpers.apiKeys.createOneForAccount(resellerUser.account)
                .then(function (response) {
                  apiKey = response;
                  var newAccount = AccountsDP.generateOne('invalid');
                  API.helpers.authenticateAPIKey(apiKey.id)
                    .then(function () {
                      API.resources.accounts
                        .createOne(newAccount)
                        .expect(400)
                        .end(done);
                    });
                });
            })
        });

      it('should return `Bad Request` response when creating an account using an invalid vendor.',
        function (done) {
          API.helpers.authenticateUser(revAdmin) //using revAdmin because reseller resets the vendor
            .then(function () {
              var newAccount = AccountsDP.generateOne('invalid');
              newAccount.vendor_profile = 'vendor';
              API.resources.accounts
                .createOne(newAccount)
                .expect(400)
                .end(done);
            })
        });
    });
  });
});
