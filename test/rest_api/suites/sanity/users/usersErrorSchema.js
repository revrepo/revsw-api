/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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
var API = require('./../../../common/api');
var UsersDP = require('./../../../common/providers/data/users');

var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];
  var errorResponseSchema = SchemaProvider.getErrorResponse();

  users.forEach(function (user) {

    var testAccount;
    var testUser;

    describe('With user: ' + user.role, function () {

      describe('Users resource', function () {
        describe('Error Response Data Schema', function () {

          before(function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.helpers.accounts.createOne();
              })
              .then(function (newAccount) {
                testAccount = newAccount;
                return API.helpers.users.create({
                  account_id: newAccount.id
                });
              })
              .then(function (user_) {
                testUser = user_;
              })
              .then(done)
              .catch(done);
          });

          after(function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.users.deleteOne(testUser.id).end(done);
                //API.resources.apiKeys.deleteAllPrerequisites(done);// TODO-NOTE: this method not work
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying `error response` schema when ' +
            'getting all Users.',
            function (done) {
              API.session.reset();
              API.resources.users
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting specific user.',
            function (done) {
              API.session.reset();
              API.resources.users
                .getOne(testUser.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'creating specific user.',
            function (done) {
              var newUser = UsersDP.generate({
                account_id: testAccount.id
              });
              API.session.reset();
              API.resources.users
                .createOne(newUser)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'updating specific user.',
            function (done) {
              var newUser = UsersDP.generate({
                account_id: testAccount.id
              });
              API.session.reset();
              API.resources.apiKeys
                .update(testUser.id, newUser)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'deleting a user.',
            function (done) {
              API.session.reset();
              API.resources.users
                .deleteOne(testUser.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });
        });
      });
    });
  });
});
