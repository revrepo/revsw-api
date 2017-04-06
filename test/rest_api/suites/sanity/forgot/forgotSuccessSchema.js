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
var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.gMail');
  var responseSchema = SchemaProvider.getForgotResponse();

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Forgot resource', function () {
    describe('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return response applying `forgot` schema.',
        function (done) {
          API.resources.forgot
            .createOne({email: user.email})
            .expect(200)
            .then(function (response) {
              var forgotResponse = response.body;
              Joi.validate(forgotResponse, responseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
