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

// # Smoke check: countries
var config = require('config');
var should = require('should');

var API = require('./../../common/api');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Countries resource', function () {
    it('should return a response when getting all countries.', function (done) {
      API.resources.countries
        .getAll()
        .expect(200)
        .end(done);
    });

    it('should contain countries in a response when getting countries', function (done) {
      API.resources.countries
        .getAll()
        .expect(200)
        .then(function (res) {
          should(res.body.US).not.equal(undefined);
          done();
        })
        .catch(done);
    });
  });
});
