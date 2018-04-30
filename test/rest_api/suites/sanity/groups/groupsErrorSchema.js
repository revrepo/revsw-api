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
var GroupsDP = require('./../../../common/providers/data/groups');

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
  var errorResponseSchema = SchemaProvider.getErrorResponse();

  users.forEach(function (user) {

    var testAccount;
    var testGroup;

    describe('With user: ' + user.role, function () {

      describe('Groups resource', function () {
        describe('Error Response Data Schema', function () {

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
                return API.helpers.groups.create({
                  account_id: newAccount.id
                });
              })
              .then(function (group_) {
                testGroup = group_;
              })
              .then(done)
              .catch(done);
          });

          after(function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.groups.deleteOne(testGroup.id).end(done);
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
            'getting all Groups.',
            function (done) {
              API.session.reset();
              API.resources.groups
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting specific group.',
            function (done) {
              API.session.reset();
              API.resources.groups
                .getOne(testGroup.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'creating specific group.',
            function (done) {
              var newGroup = GroupsDP.generateValid({
                account_id: testAccount.id
              });
              API.session.reset();
              API.resources.groups
                .createOne(newGroup)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'updating specific group.',
            function (done) {
              var newGroup = GroupsDP.generateValid({
                account_id: testAccount.id
              });
              API.session.reset();
              API.resources.groups
                .update(testGroup.id, newGroup)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'deleting a group.',
            function (done) {
              API.session.reset();
              API.resources.groups
                .deleteOne(testGroup.id)
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
