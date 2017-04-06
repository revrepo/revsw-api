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
var Joi = require('joi');

var config = require('config');

var API = require('./../../../common/api');
var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

  this.timeout(config.get('api.request.maxTimeout'));

  var errorResponseSchema = SchemaProvider.getErrorResponse();

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Locations resource', function () {
    describe('Error Response Data Schema', function () {

      it('should return data applying `error response` schema when getting ' +
        '`first-mile` data.',
        function (done) {
          API.session.reset();
          API.resources.locations
            .firstMile()
            .getOne()
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when getting ' +
        '`last-mile` data.',
        function (done) {
          API.session.reset();
          API.resources.locations
            .lastMile()
            .getOne()
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
