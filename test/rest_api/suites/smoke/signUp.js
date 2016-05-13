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

// # Smoke check: Sign Up
var config = require('config');

var API = require('./../../common/api');
var UsersDP = require('./../../common/providers/data/users');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  var revAdmin = config.get('api.users.revAdmin');

  // Generating new `user` data in order to use later in our tests.
  //var userSample = DataProvider.generateUser();
  // Retrieving information about specific user that later we will use for
  // our API requests.

  //var resellerUser = config.get('api.users.reseller');

  //before(function (done) {
  //  API.helpers
  //    .authenticateUser(resellerUser)
  //    .then(function () {
  //      API.resources.users
  //        .createOneAsPrerequisite(userSample)
  //        .then(function (response) {
  //          userSample.id = response.body.object_id;
  //          userSample.name = userSample.email;
  //
  //          return API.resources.authenticate.createOne({
  //            email: userSample.email,
  //            password: userSample.password
  //          });
  //        })
  //        .then(function (response) {
  //          userSample.token = response.body.token;
  //          done();
  //        })
  //        .catch(done);
  //    })
  //    .catch(done);
  //});
  //
  //after(function (done) {
  //  API.helpers
  //    .authenticateUser(resellerUser)
  //    .then(function () {
  //      API.resources.users.deleteAllPrerequisites(done);
  //    })
  //    .catch(done);
  //});

  describe('Sign Up resource', function () {

    it('should return success response when signing up user',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            return API.helpers.billingPlans.getRandomOne();
          })
          .then(function (bPlan) {
            API.session.reset();
            var newUser = UsersDP.generateOneToSignUp(bPlan.chargify_handle);
            API.resources.signUp
              .createOne(newUser)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    xit('should return success response when resending confirmation email',
      function (done) {
        var email = '';
        API.resources.signUp
          .resend()
          .getOne(email)
          .expect(200)
          .end(done)
          .catch(done);
      });

    xit('should return success response when verifying user',
      function (done) {
        var token = '';
        API.resources.signUp
          .verify()
          .createOne(token)
          .expect(200)
          .end(done)
          .catch(done);
      });
  });
});

