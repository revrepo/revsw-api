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
var MailinatorHelper = require('./../../common/helpers/external/mailinator');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  var testUser;
  var revAdmin = config.get('api.users.revAdmin');

  beforeEach(function (done) {
    API.helpers.signUp.createOne()
      .then(function (user) {
        testUser = user;
        done();
      })
      .catch(done);
  });

  afterEach(function (done) {
    done();
  });

  describe('Sign Up resource', function () {

    it('should return sucess response when signing up user using a random billing plan',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            return API.helpers.billingPlans.getRandomOne();
          })
          .then(function (bPlan) {
            API.session.reset();
            var newUser = API.providers.data.users.generateToSignUp({
              billingPlan: bPlan.chargify_handle
            });
            API.resources.signUp
              .createOne(newUser)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when resending confirmation email',
      function (done) {
        API.resources.signUp
          .resend()
          .getOne(testUser.email)
          .expect(200)
          .end(done);
      });

    it('should return success response when verifying just signed-up user',
      function (done) {
        MailinatorHelper
          .getVerificationToken(testUser.email)
          .then(function (token) {
            API.resources.signUp
              .verify()
              .getOne(token)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});

