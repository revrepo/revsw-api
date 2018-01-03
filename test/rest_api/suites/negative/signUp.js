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
require('should');
// # Smoke check: Sign Up
var config = require('config');

var API = require('./../../common/api');
var UsersDP = require('./../../common/providers/data/users');
var MailinatorHelper = require('./../../common/helpers/external/mailinator');

describe('Negative check', function () {
  this.timeout(config.get('api.request.maxTimeout'));


  describe('Sign Up resource', function () {
    var revAdmin = config.get('api.users.revAdmin');

    it('should return failed `501` response when signing up user that is already signed up',
      function (done) {
        API.helpers.signUp.createOne()
          .then(function (user) {
            testUser = user;
            API.helpers.signUp.createOne(testUser)
              .then(function (res) {
                res.status.should.equal(501);
                done();
              })
              .catch(function (err) {
                throw new Error(err);
                done();
              });
          })
          .catch(function (err) {
            throw new Error(err);
            done();
          });
      });

    it('should return `400` response when resending confirmation email to a verified email',
      function (done) {
        API.helpers.signUp.createOne()
          .then(function (user) {
            MailinatorHelper
              .getVerificationToken(user.email, 'New User Email Verification Request')
              .then(function (token) {
                API.resources.signUp
                  .verify()
                  .getOne(token)
                  .expect(200)
                  .then(function () {
                    API.resources.signUp
                      .resend()
                      .getOne(user.email)
                      .expect(400)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(function (err) {
            throw new Error(err);
            done();
          });
      });
  });
});
