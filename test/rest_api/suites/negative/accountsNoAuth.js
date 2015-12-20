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
var accounts = require('./../../common/resources/accounts');
var API = require('./../../common/api');
var AccountsDP = require('./../../common/providers/data/accounts');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var accountSample = AccountsDP.generateOne('noAuth');
  var resellerUser = config.get('api.users.reseller');

  before(function (done) {
    API.helpers
      .authenticateUser(resellerUser)
      .then(function () {
        API.resources.accounts
          .createOneAsPrerequisite(accountSample)
          .then(function (response) {
            accountSample.id = response.body.object_id;
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(resellerUser)
      .then(function () {
        API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Accounts resource', function () {
    describe('Without authorization', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Unauthorized` response when getting all accounts.',
        function (done) {
          API.session.reset();
          API.resources.accounts
            .getAll()
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when getting specific account.',
        function (done) {
          API.session.reset();
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when creating specific account',
        function (done) {
          var newAccount = AccountsDP.generateOne('noAuth');
          API.session.reset();
          API.resources.accounts
            .createOne(newAccount)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when updating specific account',
        function (done) {
          var updatedAccount = AccountsDP.generateOne('UPDATED');
          API.session.reset();
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when deleting an account.',
        function (done) {
          API.session.reset();
          API.resources.accounts
            .deleteOne(accountSample.id)
            .expect(401)
            .end(done);
        });
    });
  });
});
