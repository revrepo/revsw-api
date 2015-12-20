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

require('should-http');

var config = require('config');
var accounts= require('./../../common/resources/accounts');
var API= require('./../../common/api');
var AccountsDP= require('./../../common/providers/data/accounts');

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var accountSample = AccountsDP.generateOne();
  var resellerUser = config.api.users.reseller;

  before(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.accounts
      .createOneAsPrerequisite(accountSample)
      .then(function (response) {
        accountSample.id = response.body.object_id;
        done();
      });
  });

  after(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.accounts.deleteAllPrerequisites(done);
  });

  describe('Accounts resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should allow to get all accounts.',
      function (done) {
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .getAll()
          .expect(200)
          .then(function (response) {
            var accounts = response.body;
            accounts.should.not.be.empty();
            accounts.length.should.greaterThan(0);
            done();
          });
      });

    it('should allow to get specific account.',
      function (done) {
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .getOne(accountSample.id)
          .expect(200)
          .then(function (response) {
            var account = response.body;
            account.companyName.should.equal(accountSample.companyName);
            account.createdBy.should.equal(resellerUser.name);
            account.id.should.equal(accountSample.id);
            account.created_at.should.not.be.empty();
            account.updated_at.should.not.be.empty();
            done();
          });
      });

    it('should allow to create an account.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .createOne(newAccount)
          .expect(200)
          .then(function (response) {
            var newAccount = response.body;
            newAccount.statusCode.should.equal(200);
            newAccount.message.should.equal('Successfully created new account');
            newAccount.object_id.should.not.be.empty();
            // TODO: register prerequisite
            API.resources.accounts
              .deleteOne(newAccount.object_id)
              .end(done);
          });
      });

    it('should allow to update an account.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        var updatedAccount = AccountsDP.generateOne('UPDATED');
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .createOneAsPrerequisite(newAccount)
          .then(function (response) {
            API.resources.accounts
              .update(response.body.object_id, updatedAccount)
              .expect(200)
              .then(function (response) {
                var account = response.body;
                account.statusCode.should.equal(200);
                account.message.should.equal('Successfully updated the ' +
                  'account');
                done();
              });
          });
      });

    it('should allow to delete an account.', function (done) {
      var newProject = AccountsDP.generateOne();
      API.session.setCurrentUser(resellerUser);
      API.resources.accounts
        .createOneAsPrerequisite(newProject)
        .then(function (response) {
          API.resources.accounts
            .deleteOne(response.body.object_id)
            .expect(200)
            .then(function (response) {
              var account = response.body;
              account.statusCode.should.equal(200);
              account.message.should.equal('Successfully deleted the account');
              done();
            });
        });
    });
  });
});
