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

// # Functional check: Reset
var config = require('config');

var API = require('./../../common/api');
var MailinatorHelper = require('./../../common/helpers/external/mailinator');

describe('Functional check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  var testUser;
  var testToken;

  before(function (done) {
    API.helpers
      .signUpAndVerifyUser()
      .then(function (user) {
        testUser = user;
        return API.resources.forgot
          .createOne({email: testUser.email})
          .then(function () {
            return MailinatorHelper
              .getVerificationToken(testUser.email, 'Customer Portal Password Reset')
              .then(function (token) {
                testToken = token;
                done();
              })
              .catch(done);
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Reset resource', function () {

    it('should allow user to authenticate after success password reset',
      function (done) {
        var newPassword = 'password2';
        API.session.reset();
        API.resources.reset
          .createOne(testToken, {password: newPassword})
          .then(function () {
            testUser.password = newPassword;
            API.session.reset();
            API.identity
              .authenticate(testUser)
              .then(function () {
                testUser.email.should.equal(API.session.getCurrentUser().email);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});

