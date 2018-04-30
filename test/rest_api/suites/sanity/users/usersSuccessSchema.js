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
var _ = require('lodash');
var config = require('config');
var API = require('./../../../common/api');
var UsersDP = require('./../../../common/providers/data/users');

var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.apikeys.admin'),
    config.get('api.apikeys.reseller')
  ];

  users.forEach(function (user) {

    var testAccount;
    var testUser;

    describe('With user: ' + user.role, function () {

      describe('User resource', function () {
        describe('Success Response Data Schema', function () {

          before(function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                if (user.role === 'reseller') {
                  return API.helpers.accounts.createOne();
                } else {
                  return user.account;
                }                
              })
              .then(function (newAccount) {
                testAccount = newAccount;
                return API.helpers.users.create({
                  account_id: testAccount.id
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
              .authenticate(user)
              .then(function () {
                API.resources.users.deleteOne(testUser.id).end(done);
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying users schema when getting all users.',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.users
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var users = response.body;
                  Joi.validate(users, SchemaProvider.getListOfUsers(), function (err) {
                    if (err) {
                      return done(err);
                    }
                  });
                  done();
                })
                .catch(done);
            })

          it('should return data applying user schema when getting specific ' +
            'user',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.users
                    .getOne(testUser.id)
                    .expect(200);
                })
                .then(function (response) {
                  var user_ = response.body;
                  Joi.validate(user_, SchemaProvider.getUser(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'creating specific user.',
            function (done) {
              var newUser = UsersDP.generate({
                account_id: testAccount.id
              });
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.users
                    .createOne(newUser)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getCreateUserStatus(),
                    function (error) {
                      if (error) {
                        return done(error);
                      }
                      API.resources.users
                        .deleteOne(data.object_id)
                        .end(done);
                    });
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'updating specific user.',
            function (done) {
              var newUser = UsersDP.generate({
                account_id: testAccount.id
              });
              var updatedUser = _.cloneDeep(newUser);
              updatedUser.firstname = 'AsherUpdated';
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.users.createOne(newUser);
                })
                .then(function (response) {
                  return API.resources.users
                    .update(response.body.object_id, updatedUser)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getSuccessResponse(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'deleting a user.',
            function (done) {
              var newUser = UsersDP.generate({
                account_id: testAccount.id
              });
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.users.createOne(newUser);
                })
                .then(function (response) {
                  return API.resources.users
                    .deleteOne(response.body.object_id)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getUserStatus(), done);
                })
                .catch(done);
            });
        });
      });
    });
  });
});
