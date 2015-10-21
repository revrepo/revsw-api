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

var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataProvider = require('./../common/providers/data');
var SchemaProvider = require('./../common/providers/schema');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var accountSample = DataProvider.generateAccount();
  var resellerUser = config.api.users.reseller;
  var normalUser = config.api.users.user;
  var errorResponseSchema = SchemaProvider.getErrorResponse();

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
    API.resources.accounts
      .removeAllPrerequisites()
      .finally(done);
  });

  describe('Accounts resource', function () {
    describe('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `error response` schema when getting ' +
        'all accounts.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .getAll()
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when getting ' +
        'specific account.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when ' +
        'creating specific account.',
        function (done) {
          var newAccount = DataProvider.generateAccount();
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .createOne(newAccount)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(403);
        });

      it('should return data applying `error response` schema when ' +
        'updating specific account.',
        function (done) {
          var updatedAccount = DataProvider.generateAccount('UPDATED');
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when deleting ' +
        'an account.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .remove(accountSample.id)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
