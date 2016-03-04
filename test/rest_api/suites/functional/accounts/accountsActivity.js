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

var config = require('config');
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var accountSample = AccountsDP.generateOne('NEW');
  var resellerUser = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Accounts - Activity resource', function () {

    beforeEach(function (done) {
      API.helpers
        .authenticateUser(resellerUser)
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
            .createOneAsPrerequisite(accountSample)
            .then(function (response) {
              accountSample.id = response.body.object_id;
              done();
            })
            .catch(done);
        })
        .catch(done);
    });

    afterEach(function (done) {
      API.helpers
        .authenticateUser(resellerUser)
        .then(function () {
          API.resources.accounts.deleteAllPrerequisites(done);
        })
        .catch(done);
      done();
    });

    xit('should return a response when getting all accounts.',
      function (done) {
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    xit('should return a response when getting specific account.',
      function (done) {
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .getOne(accountSample.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a response when creating specific account.',
      function (done) {
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.activity
              .getAll({user_id: resellerUser.id})
              .expect(200)
              .then(function (response) {
                // TODO: Move all of this to Utils.searchJsonInArray(json, array);
                var activities = response.body.data;
                var activity;
                for (var i = 0, len = activities.length; i < len; i++) {
                  activity = activities[i];
                  if (activity.activity_type === 'add' &&
                    activity.activity_target === 'account' &&
                    activity.target_id === accountSample.id) {
                    break;
                  }
                }
                activity.activity_type.should.equal('add');
                activity.activity_target.should.equal('account');
                activity.target_id.should.equal(accountSample.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should return a response when updating specific account.',
      function (done) {
        var updatedAccount = AccountsDP.generateOne('UPDATED');
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .update(accountSample.id, updatedAccount)
              .expect(200)
              .then(function () {
                API.resources.activity
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var activity = response.body.data[0];
                    activity.activity_type.should.equal('modify');
                    activity.activity_target.should.equal('account');
                    activity.target_object.id.should.equal(accountSample.id);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should return a response when deleting an account.', function (done) {
      var newProject = AccountsDP.generateOne('NEW');
      API.helpers
        .authenticateUser(resellerUser)
        .then(function () {
          API.resources.accounts
            .createOneAsPrerequisite(newProject)
            .then(function (response) {
              var objectId = response.body.object_id;
              API.resources.accounts
                .deleteOne(objectId)
                .expect(200)
                .end(done);
            })
            .catch(done);
        })
        .catch(done);
    });
  });
});
