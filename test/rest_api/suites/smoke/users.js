/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

// # Smoke check: users
var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');

describe('Smoke check: Users', function() {
  this.timeout(config.api.request.maxTimeout);

  var users = [
    config.api.users.revAdmin,
    config.api.users.reseller,
    config.api.users.admin
  ];
  // Retrieving information about specific user that later we will use for
  // our API requests.
  users.forEach(function(credentials) {
    // Generating new `user` data in order to use later in our tests.
    var userSample = DataProvider.generateUser();
    if(credentials.role === config.api.users.revAdmin.role) {
      userSample.companyId = [credentials.account.id];
    }
    before(function(done) {
      API.helpers
        .authenticate(credentials)
        .then(function() {
          API.resources.users
            .createOne(userSample)
            .then(function (response) {
              userSample.id = response.body.object_id;
              userSample.name = userSample.email;

              return API.resources.authenticate.createOne({
                email: userSample.email,
                password: userSample.password
              });
            })
            .then(function (response) {
              userSample.token = response.body.token;
              done();
            })
            .catch(done);
        })
        .catch(done);
    });

    after(function (done) {
      done();
    });

    describe('Users resource for user with role ' + credentials.role, function() {
      it('should return a response when getting all users.',
        function(done) {
          API.helpers
            .authenticate(credentials)
            .then(function() {
              API.resources.users
                .getAll()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return a response when getting specific user.',
        function (done) {
          API.helpers
            .authenticate(credentials)
            .then(function () {
              API.resources.users
                .getOne(userSample.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return a response when creating specific user.',
        function (done) {
          var newUser = DataProvider.generateUser();
          if(credentials.role === config.api.users.revAdmin.role) {
            newUser.companyId = [credentials.account.id];
          }
          API.helpers
            .authenticate(credentials)
            .then(function () {
              API.resources.users
                .createOne(newUser)
                .expect(200)
                .then(function (response) {
                  API.resources.users
                    .deleteOne(response.body.object_id)
                    .end(done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return a response when updating specific user.',
        function (done) {
          var newUser = DataProvider.generateUser();
          if(credentials.role === config.api.users.revAdmin.role) {
            newUser.companyId = [credentials.account.id];
          }
          API.helpers
            .authenticate(credentials)
            .then(function () {
              API.resources.users
                .createOne(newUser)
                .then(function (response) {
                  newUser.firstName = 'John';
                  newUser.lastName = 'Doe';
                  API.resources.users
                    .update(response.body.object_id, newUser)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return a response when deleting a user.', function(done) {
        var newUser = DataProvider.generateUser();
        if(credentials.role === config.api.users.revAdmin.role) {
          newUser.companyId = [credentials.account.id];
        }
        API.helpers
          .authenticate(credentials)
          .then(function () {
            API.resources.users
              .createOne(newUser)
              .then(function (response) {
                var objectId = response.body.object_id;
                API.resources.users
                  .deleteOne(objectId)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          })
          .catch(done);
      });

      it('should return a response when getting my user profile.',
        function(done) {
          API.helpers
            .authenticate(credentials)
            .then(function () {
              API.resources.users
                .myself()
                .getOne()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      // ### Spec/test to update a user's password
      it('should return a response when updating specific user\'s password.',
        function(done) {
          API.helpers
            .authenticate(userSample)
            .then(function () {
              API.resources.users
                .password()
                .update(userSample.id, {
                  current_password: userSample.password,
                  new_password: 'secret321'
                })
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
    });
  }); // end users.forEach

  // NOTE: smoke test only for user with role 'User'
  var userRole = config.api.users.user;
  describe('Users resource for user with role ' + userRole.role, function() {
    it('should return a response when getting my user profile',
      function(done) {
        API.helpers
          .authenticate(userRole)
          .then(function() {
            API.resources.users
              .myself()
              .getOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });

});
