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

var API = require('./../../common/api');

describe('CRUD check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var resellerUser = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Locations resource', function () {
    it('should allow to get `first-mile` data.',
      function (done) {
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.locations
              .firstMile()
              .getOne()
              .expect(200)
              .then(function (response) {
                var locations = response.body;
                locations.should.not.be.undefined();
                locations.length.should.greaterThanOrEqual(0);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to get `first-mile` data.',
      function (done) {
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.locations
              .lastMile()
              .getOne()
              .expect(200)
              .then(function (response) {
                var locations = response.body;
                locations.should.not.be.undefined();
                locations.length.should.greaterThanOrEqual(0);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
