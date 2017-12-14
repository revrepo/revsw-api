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

var should = require('should');

var config = require('config');
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var Utils = require('./../../../common/utils');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var accountSample;
  var resellerUser = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Accounts - Activity resource', function () {

    beforeEach(function (done) {
      accountSample = AccountsDP.generateOne('NEW');
      API.identity
        .authenticate(resellerUser)
        .then(function () {
          API.resources.users
            .myself()
            .getOne()
            .then(function (response) {
              resellerUser.id = response.body.user_id;
            })
            .catch(done);
        })
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

    afterEach(function (done) {
      done();
    });

    it('should return activity data after creating an account.',
      function (done) {
        API.identity
          .authenticate(resellerUser)
          .then(function () {
            API.resources.activity
              .getAll({user_id: resellerUser.id})
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'add',
                  'activity_target': 'account',
                  'target_id': accountSample.id
                });
                should.exist(activity);
                activity.activity_type.should.equal('add');
                activity.activity_target.should.equal('account');
                activity.target_id.should.equal(accountSample.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return activity data after updating specific account.',
      function (done) {
        var updatedAccount = AccountsDP.generateOne('UPDATED');
        API.identity
          .authenticate(resellerUser)
          .then(function () {
            return API.resources.accounts
              .update(accountSample.id, updatedAccount)
              .expect(200)
              .then()
              .catch(done);
          })
          .then(function () {
            API.resources.activity
              .getAll({user_id: resellerUser.id})
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'modify',
                  'activity_target': 'account',
                  'target_id': accountSample.id
                });
                should.exist(activity);
                activity.activity_type.should.equal('modify');
                activity.activity_target.should.equal('account');
                activity.target_id.should.equal(accountSample.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return activity data after deleting an account.',
      function (done) {
        var testAccountId;
        var newProject = AccountsDP.generateOne('NEW');
        API.identity
          .authenticate(resellerUser)
          .then(function () {
            return API.resources.accounts
              .createOne(newProject)
              .then(function (response) {
                return response.body.object_id;
              })
              .catch(done);
          })
          .then(function (objectId) {
            console.log('objectId', objectId);
            testAccountId = objectId;
            return API.resources.accounts
              .deleteOne(objectId)
              .expect(200)
              .then()
              .catch(done);
          })
          .then(function () {
            API.resources.activity
              .getAll({user_id: resellerUser.id})
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'delete',
                  'activity_target': 'account',
                  'target_id': testAccountId
                });
                should.exist(activity);
                activity.activity_type.should.equal('delete');
                activity.activity_target.should.equal('account');
                activity.target_id.should.equal(testAccountId);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
