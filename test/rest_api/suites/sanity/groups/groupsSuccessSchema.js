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

  users.forEach(function (user) {

    var testAccount;
    var testGroup;

    describe('With user: ' + user.role, function () {

      describe('Group resource', function () {
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
                return API.helpers.groups.create({
                  account_id: testAccount.id
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
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying groups schema when getting all groups.',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.groups
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var groups = response.body;
                  Joi.validate(groups, SchemaProvider.getListOfGroups(), function (err) {
                    if (err) {
                      return done(err);
                    }
                  });
                  done();
                })
                .catch(done);
            })

          it('should return data applying group schema when getting specific ' +
            'group',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.groups
                    .getOne(testGroup.id)
                    .expect(200);
                })
                .then(function (response) {
                  var group_ = response.body;
                  Joi.validate(group_, SchemaProvider.getGroup(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'creating specific group.',
            function (done) {
              var newGroup = GroupsDP.generateValid({
                account_id: testAccount.id
              });
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.groups
                    .createOne(newGroup)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getSuccessCreateResponse(),
                    function (error) {
                      if (error) {
                        return done(error);
                      }
                      API.resources.groups
                        .deleteOne(data.object_id)
                        .end(done);
                    });
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'updating specific group.',
            function (done) {
              var newGroup = GroupsDP.generateValid({
                account_id: testAccount.id
              });
              var updatedGroup = _.cloneDeep(newGroup);
              updatedGroup.name = 'AsherUpdated';
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.groups.createOne(newGroup);
                })
                .then(function (response) {
                  return API.resources.groups
                    .update(response.body.object_id, updatedGroup)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getSuccessResponse(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'deleting a group.',
            function (done) {
              var newGroup = GroupsDP.generateValid({
                account_id: testAccount.id
              });
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.resources.groups.createOne(newGroup);
                })
                .then(function (response) {
                  return API.resources.groups
                    .deleteOne(response.body.object_id)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getSuccessResponse(), done);
                })
                .catch(done);
            });
        });
      });
    });
  });
});
