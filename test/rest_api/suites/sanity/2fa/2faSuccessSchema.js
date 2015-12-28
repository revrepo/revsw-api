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
var Joi = require('joi');

var config = require('config');
var API = require('./../../../common/api');
var TwoFADP = require('./../../../common/providers/data/2fa');
var CommonRespSP = require('./../../../common/providers/schema/commonResponse');
var TwoFARespSP = require('./../../../common/providers/schema/2faResponse');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user;
  var reseller = config.get('api.users.reseller');
  var successResponseSchema = CommonRespSP.getSuccess();
  var successTwoFAKeySchema = TwoFARespSP.getSuccessCreateKey();

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('2fa resource', function () {

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

    it('should return success response schema when initializing 2fa for ' +
      'specific user',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function (res) {
                var data = res.body;
                Joi.validate(data, successTwoFAKeySchema, done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return success response schema when enabling 2fa for user',
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
                  .then(function (res) {
                    var data = res.body;
                    Joi.validate(data, successResponseSchema, done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return success response schema when disabling 2fa for user',
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
                      .createOne(user.id)
                      .expect(200)
                      .then(function (res) {
                        var data = res.body;
                        Joi.validate(data, successResponseSchema, done);
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
