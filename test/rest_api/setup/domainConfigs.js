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

var config = require('config');
var API = require('./../common/api');

describe('Clean up domainConfigs', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var resellerUser = config.api.users.reseller;

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('domainConfigs resource', function () {

    // Use this block to run some statements before an spec/test starts its
    // execution. This is not the same as before method call.
    beforeEach(function (done) {
      done();
    });

    // Use this block to run some statements after an spec/test ends its
    // execution. This is not the same as after method call.
    afterEach(function (done) {
      done();
    });

    it('should clean domainConfigs environment.',
      function (done) {
        var namePattern = /API-QA-name-/;
        API.session.setCurrentUser(resellerUser);
        API.resources.domainConfigs.config
          .getAll()
          .expect(200)
          .then(function (res) {
            var ids = [];
            var domains = res.body;
            var total = domains.length;
            for (var i = 0; i < total; i++) {
              var domain = domains[i];
              if (namePattern.test(domain.domain_name)) {
                ids.push(domain.id);
              }
            }
            API.resources.domainConfigs.config
              .deleteMany(ids)
              .finally(done);
          });
      });
  });
});
