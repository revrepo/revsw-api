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
var accounts = require('./../../../common/resources/accounts');
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var accountSample = AccountsDP.generateOne('test');
  var resellerUser = config.get('api.users.reseller');
  var expectedDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

  before(function (done) {
    API.helpers
      .authenticateUser(resellerUser)
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
    describe('Date Format', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `created_at` field in expected `Date format` when ' +
        'getting all accounts.',
        function (done) {
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getAll()
                .expect(200)
                .then(function (response) {
                  var accounts = response.body;
                  accounts.forEach(function (account) {
                    account.created_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `created_at` field in expected `Date format` when ' +
        'getting specific account.',
        function (done) {
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getOne(accountSample.id)
                .expect(200)
                .then(function (response) {
                  var account = response.body;
                  account.created_at.should.match(expectedDateFormat);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `updated_at` field in expected `Date format` when ' +
        'getting all accounts.',
        function (done) {
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getAll()
                .expect(200)
                .then(function (response) {
                  var accounts = response.body;
                  accounts.forEach(function (account) {
                    account.updated_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `updated_at` field in expected `Date format` when ' +
        'getting specific account.',
        function (done) {
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getOne(accountSample.id)
                .expect(200)
                .then(function (response) {
                  var account = response.body;
                  account.updated_at.should.match(expectedDateFormat);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
