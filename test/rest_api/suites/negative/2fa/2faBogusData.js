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

require('should-http');

var config = require('config');
var API = require('./../../../common/api');
var TwoFADP = require('./../../../common/providers/data/2fa');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user;
  var reseller = config.get('api.users.reseller');
  var bogusString = '!@#$%^&*()';

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('2fa resource', function () {
    describe('With bogus data,', function () {

      beforeEach(function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            return API.helpers.users.createOne({
              firstName: 'Tom',
              lastName: 'Smith'
            });
          })
          .then(function (newUser) {
            user = newUser;
          })
          .then(done)
          .catch(done);
      });

      afterEach(function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            // TODO: this should be changed to the new way to create a resource
            return API.resources.users.user.deleteAllPrerequisites(done);
          })
          .catch(done);
      });

      it('should return `bad request` when enabling 2fa for user with bogus ' +
        'oneTimePassword',
        function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              API.resources.twoFA
                .init()
                .getOne()
                .expect(200)
                .then(function (res) {
                  var key = res.body.base32;
                  var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                  oneTimePassword.oneTimePassword = bogusString;
                  API.resources.twoFA
                    .enable()
                    .createOne(oneTimePassword)
                    .expect(400)
                    .then(function (response) {
                      var expMsg = 'The supplied one time password is ' +
                        'incorrect';
                      response.body.message.should.equal(expMsg);
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `bad request` when disabling 2fa for user with bogus ' +
        'user ID',
        function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              API.resources.twoFA
                .init()
                .getOne()
                .expect(200)
                .then(function (res) {
                  var key = res.body.base32;
                  var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                  API.resources.twoFA
                    .enable()
                    .createOne(oneTimePassword)
                    .expect(200)
                    .then(function () {
                      API.resources.twoFA
                        .disable()
                        .createOne(bogusString)
                        .expect(400)
                        .then(function (response) {
                          var expMsg = 'child "user_id" fails';
                          response.body.message.should.containEql(expMsg);
                          done();
                        })
                        .catch(done);
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
