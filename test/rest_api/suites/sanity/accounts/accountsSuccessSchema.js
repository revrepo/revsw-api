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
var Joi = require('joi');

var config = require('config');
var accounts = require('./../../../common/resources/accounts');
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var SchemaProvider = require('./../../../common/providers/schema');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var accountSample = AccountsDP.generateOne('test');
  var resellerUser = config.get('api.users.reseller');
  var accountSchema = SchemaProvider.getAccount();
  var successResponseSchema = SchemaProvider.getSuccessResponse();
  var successCreateResponseSchema = SchemaProvider.getSuccessCreateResponse();

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
    describe('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying accounts schema when getting all ' +
        'accounts.',
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
                    Joi.validate(account, accountSchema, function (err) {
                      if (err) {
                        return done(err);
                      }
                    });
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying accounts schema when getting specific ' +
        'account.',
        function (done) {
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getOne(accountSample.id)
                .expect(200)
                .then(function (response) {
                  var account = response.body;
                  Joi.validate(account, accountSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'creating specific account.',
        function (done) {
          var newAccount = AccountsDP.generateOne('test');
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .createOne(newAccount)
                .expect(200)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, successCreateResponseSchema, function (error) {
                    if (error) {
                      return done(error);
                    }
                    // TODO: register prerequisite
                    API.resources.accounts
                      .deleteOne(data.object_id)
                      .end(done);
                  });
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'updating specific account.',
        function (done) {
          var newAccount = AccountsDP.generateOne('test');
          var updatedAccount = AccountsDP.generateOne('UPDATED');
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .createOneAsPrerequisite(newAccount)
                .then(function (response) {
                  API.resources.accounts
                    .update(response.body.object_id, updatedAccount)
                    .expect(200)
                    .then(function (response) {
                      var data = response.body;
                      Joi.validate(data, successResponseSchema, done);
                    });
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'deleting an account.',
        function (done) {
          var newProject = AccountsDP.generateOne('test');
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .createOneAsPrerequisite(newProject)
                .then(function (response) {
                  API.resources.accounts
                    .deleteOne(response.body.object_id)
                    .expect(200)
                    .then(function (response) {
                      var data = response.body;
                      Joi.validate(data, successResponseSchema, done);
                    });
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
