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

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user;
  var reseller = config.get('api.users.reseller');
  var errorResponseSchema = CommonRespSP.getError();

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('2fa resource', function () {
    describe('Error Response Data Schema', function () {

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
            return API.resources.users.deleteAllPrerequisites(done);
          })
          .catch(done);
      });

      it('should return error response schema when initializing 2fa without ' +
        'authentication',
        function (done) {
          API.session.reset();
          API.resources.twoFA
            .init()
            .getOne()
            .expect(401)
            .then(function (res) {
              var data = res.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return error response schema when enabling 2fa without ' +
        'authentication',
        function (done) {
          var key = 'res.body.base32';
          var oneTimePassword = TwoFADP.generateOneTimePassword(key);
          API.resources.twoFA
            .enable()
            .createOne(oneTimePassword)
            .expect(400)
            .then(function (res) {
              var data = res.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      xit('should return error response schema when disabling 2fa without ' +
        'authentication',
        function (done) {
          API.resources.twoFA
            .disable()
            .createOne(user.id)
            .expect(400)
            .then(function (res) {
              var data = res.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
