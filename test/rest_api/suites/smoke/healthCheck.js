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
var should = require('should');

var config = require('config');
var API = require('./../../common/api');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  describe('HealthCheck resource', function () {

    it('should return a response when getting health-check info.',
      function (done) {
        API.resources.healthCheck
          .getAll()
          .expect(200)
          .end(done);
      });

      it('should contain valid data in health-check response',
      function (done) {
        API.resources.healthCheck
          .getAll()
          .expect(200)
          .then(function(res) {
            should(res.body.message).not.equal(undefined);
            should(res.body.version).not.equal(undefined);
            done();
          })
          .catch(done);
      });
  });
});
