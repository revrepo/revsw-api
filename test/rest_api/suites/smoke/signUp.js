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
require('should-http');
// # Smoke check: Sign Up
var config = require('config');

var API = require('./../../common/api');
var UsersDP = require('./../../common/providers/data/users');
var MailinatorHelper = require('./../../common/helpers/external/mailinator');

describe('Smoke check', function() {
  this.timeout(config.get('api.request.maxTimeout'));


  describe('Sign Up resource', function() {
    var revAdmin = config.get('api.users.revAdmin');

    it('should return sucess response when signing up user using a random billing plan',
      function(done) {
        API.identity
          .authenticate(revAdmin)
          .then(function() {
            return API.helpers.billingPlans.getRandomOne();
          })
          .then(function(bPlan) {
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

    describe('for just signed-up user', function() {
      var testUser;
      beforeEach(function(done) {
        API.helpers.signUp.createOne()
          .then(function(user) {
            testUser = user;
            done();
          })
          .catch(done);
      });

      afterEach(function(done) {
        done();
      });

      it('should return success response when resending confirmation email',
        function(done) {
          API.resources.signUp
            .resend()
            .getOne(testUser.email)
            .expect(200)
            .end(done);
        });

      it('should return success response when verifying token from user`s email',
        function(done) {
          MailinatorHelper
            .getVerificationToken(testUser.email, 'New User Email Verification Request')
            .then(function(token) {
              API.resources.signUp
                .verify()
                .getOne(token)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
    });

    describe('for just signed-up and verified user', function() {
      var testUser;
      beforeEach(function(done) {
        API.helpers.signUpAndVerifyUser()
          .then(function(user) {
            testUser = user;
            return testUser;
          })
          .then(function() {
            done();
          })
          .catch(done);
      });

      it('should be created an empty dashboard',
        function(done) {
          API.identity
            .authenticate(testUser)
            .then(function() {
              return API.resources.dashboards
                .getAll()
                .expect(200);
            })
            .then(function(response) {
              var dashboards = response.body;
              dashboards.should.be.instanceof(Array).and.have.lengthOf(1);
              done();
            })
            .catch(done);
        });
    });
  });
});
