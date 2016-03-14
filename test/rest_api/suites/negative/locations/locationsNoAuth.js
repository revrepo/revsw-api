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

// # Smoke check: locations
var config = require('config');

var API = require('./../../../common/api');

describe('Negative check', function () {

  this.timeout(config.get('api.request.maxTimeout'));

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Locations resource', function () {
    describe('Without authorization', function () {
      it('should return `Unauthorized` response when getting `first-mile` ' +
        'data.',
        function (done) {
          API.session.reset();
          API.resources.locations
            .firstMile()
            .getOne()
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when getting `last-mile` data.',
        function (done) {
          API.session.reset();
          API.resources.locations
            .lastMile()
            .getOne()
            .expect(401)
            .end(done);
        });
    });
  });
});
