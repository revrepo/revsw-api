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

// # Smoke check: users
var config = require('config');

var API = require('./../common/api');
var DataProvider = require('./../common/providers/data');

describe('Smoke check', function () {
  this.timeout(config.api.request.maxTimeout);

  // Generating new `user` data in order to use later in our tests.
  var userSample = DataProvider.generateUser();
  // Retrieving information about specific user that later we will use for
  // our API requests.
  var resellerUser = config.api.users.reseller;

  before(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.users.user
      .createOneAsPrerequisite(userSample)
      .then(function (response) {
        userSample.id = response.body.object_id;
        userSample.name = userSample.email;
        done();
      });
  });

  after(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.users.user.deleteAllPrerequisites(done);
  });

  describe('Users resource', function () {
    it('should return a response when getting all users.',
      function (done) {
        // Setting user for all upcoming REST API calls
        API.session.setCurrentUser(resellerUser);

        API.resources.users.user
          .getAll()
          .expect(200)
          .end(done);
      });

    it('should return a response when getting specific user.',
      function (done) {
        // Setting user for all upcoming REST API calls
        API.session.setCurrentUser(resellerUser);

        API.resources.users.user
          .getOne(userSample.id)
          .expect(200)
          .end(done);
      });

    it('should return a response when creating specific user.',
      function (done) {
        var newUser = DataProvider.generateUser();
        API.session.setCurrentUser(resellerUser);
        API.resources.users.user
          .createOne(newUser)
          .expect(200)
          .then(function (response) {
            API.resources.users.user
              .deleteOne(response.body.object_id)
              .end(done);
          });
      });

    it('should return a response when updating specific user.',
      function (done) {
        var newUser = DataProvider.generateUser();
        API.session.setCurrentUser(resellerUser);
        API.resources.users.user
          .createOneAsPrerequisite(newUser)
          .then(function (response) {
            newUser.firstName = 'John';
            newUser.lastName = 'Doe';
            API.resources.users.user
              .update(response.body.object_id, newUser)
              .expect(200)
              .end(done);
          });
      });

    it('should return a response when deleting a user.', function (done) {
      var newUser = DataProvider.generateUser();
      API.session.setCurrentUser(resellerUser);
      API.resources.users.user
        .createOneAsPrerequisite(newUser)
        .then(function (response) {
          var objectId = response.body.object_id;
          API.resources.users.user
            .deleteOne(objectId)
            .expect(200)
            .end(done);
        });
    });
  });
});

