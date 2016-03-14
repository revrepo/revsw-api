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

  describe('Countries resource', function () {
    describe('Error Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      xit('[BUG: Getting all countries is possible without authentication]' +
        'should return data applying `error schema` when getting all ' +
        'countries.',
        function (done) {
          API.session.reset();
          API.resources.countries
            .getAll()
            .expect(401)
            .then(function (response) {
              var countries = response.body;
              Joi.validate(countries, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
