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
var SchemaProvider = require('./../../../common/providers/schema');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var errorResponseSchema = SchemaProvider.getErrorResponse();

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Forgot resource', function () {
    describe('Error Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `error response` schema when requesting' +
        'change password with empty payload data.',
        function (done) {
          API.resources.forgot
            .createOne()
            .expect(400)
            .then(function (response) {
              var forgotResponse = response.body;
              Joi.validate(forgotResponse, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when requesting' +
        'change password with empty email.',
        function (done) {
          API.resources.forgot
            .createOne({email: ''})
            .expect(400)
            .then(function (response) {
              var forgotResponse = response.body;
              Joi.validate(forgotResponse, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when requesting' +
        'change password with non registered email.',
        function (done) {
          var timestamp = Date.now();
          var nonRegisteredEmail = 'some-user-' + timestamp + '@email.com';
          API.resources.forgot
            .createOne({email: nonRegisteredEmail})
            .expect(400)
            .then(function (response) {
              var forgotResponse = response.body;
              Joi.validate(forgotResponse, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when requesting' +
        'change password with invalid email.',
        function (done) {
          var invalidEmailAddress = 'thi is @ invalid.email';
          API.resources.forgot
            .createOne({email: invalidEmailAddress})
            .expect(400)
            .then(function (response) {
              var forgotResponse = response.body;
              Joi.validate(forgotResponse, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
