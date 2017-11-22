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

  var accountSample = AccountsDP.generateOne('test');
  var anotherResellerUser = config.get('api.users.secondReseller');
  var resellerUser = config.get('api.users.reseller');
  var adminUser = config.get('api.users.admin');
  var normalUser = config.get('api.users.user');

  before(function (done) {
    API.identity
      .authenticate(resellerUser)
      .then(function () {
        API.resources.accounts
          .createOne(accountSample)
          .then(function (response) {
            accountSample.id = response.body.object_id;
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Accounts resource', function () {
    describe('With not-allowed users', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Forbidden` response when getting all accounts with ' +
        '`user-role` user.',
        function (done) {
          API.identity
            .authenticate(normalUser)
            .then(function () {
              API.resources.accounts
                .getAll()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when getting specific account ' +
        'with `user-role` user.',
        function (done) {
          API.identity
            .authenticate(normalUser)
            .then(function () {
              API.resources.accounts
                .getOne(accountSample.id)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when creating specific account ' +
        'with `user-role` user.',
        function (done) {
          var newAccount = AccountsDP.generateOne('test');
          API.identity
            .authenticate(normalUser)
            .then(function () {
              API.resources.accounts
                .createOne(newAccount)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when updating specific account ' +
        'with `user-role` user.',
        function (done) {
          var updatedAccount = AccountsDP.generateOne('UPDATED');
          API.identity
            .authenticate(normalUser)
            .then(function () {
              API.resources.accounts
                .update(accountSample.id, updatedAccount)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when deleting an account with ' +
        '`user-role` user.',
        function (done) {
          API.identity
            .authenticate(normalUser)
            .then(function () {
              API.resources.accounts
                .deleteOne(accountSample.id)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      // TODO: Now "admin" role is allowed to manipulate his account details:
      // TODO: list, read, write and even delete - please add proper positive checks
      // TODO: for the situations
      xit('should return `Forbidden` response when getting all accounts with ' +
        '`admin-role` user.',
        function (done) {
          API.identity
            .authenticate(adminUser)
            .then(function () {
              API.resources.accounts
                .getAll()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when getting specific account ' +
        'with `admin-role` user.',
        function (done) {
          API.identity
            .authenticate(adminUser)
            .then(function () {
              API.resources.accounts
                .getOne(accountSample.id)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when creating specific account ' +
        'with `admin-role` user.',
        function (done) {
          var newAccount = AccountsDP.generateOne('test');
          API.identity
            .authenticate(adminUser)
            .then(function () {
              API.resources.accounts
                .createOne(newAccount)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when updating specific account ' +
        'with `admin-role` user.',
        function (done) {
          var updatedAccount = AccountsDP.generateOne('UPDATED');
          API.identity
            .authenticate(adminUser)
            .then(function () {
              API.resources.accounts
                .update(accountSample.id, updatedAccount)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when deleting an account with ' +
        '`admin-role` user.',
        function (done) {
          API.identity
            .authenticate(adminUser)
            .then(function () {
              API.resources.accounts
                .deleteOne(accountSample.id)
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `bad request` response when getting specific account ' +
        'with another `reseller` user.',
        function (done) {
          API.identity
            .authenticate(anotherResellerUser)
            .then(function () {
              API.resources.accounts
                .getOne(accountSample.id)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `bad request` response when updating specific account ' +
        'with another `reseller` user.',
        function (done) {
          var updatedAccount = AccountsDP.generateOne('UPDATED');
          API.identity
            .authenticate(anotherResellerUser)
            .then(function () {
              API.resources.accounts
                .update(accountSample.id, updatedAccount)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `bad request` response when deleting an account with ' +
        'another `reseller` user.',
        function (done) {
          API.identity
            .authenticate(anotherResellerUser)
            .then(function () {
              API.resources.accounts
                .deleteOne(accountSample.id)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });
    });
  });
});
