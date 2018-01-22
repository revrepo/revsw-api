/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

describe('CRUD check', function() {
  this.timeout(config.get('api.request.maxTimeout'));
  describe('Locations resource', function() {
    // Defining set of users for which all below tests will be run
    var users = [
      config.get('api.users.revAdmin'),
      config.get('api.users.reseller'),
      config.get('api.users.admin'),
      config.get('api.users.user'),
      config.get('api.apikeys.admin'),
      config.get('api.apikeys.reseller')
    ];

    users.forEach(function(user) {

      describe('With user: ' + user.role, function() {



        before(function(done) {
          done();
        });

        after(function(done) {
          done();
        });

        it('should allow to get `first-mile` data.',
          function(done) {
            API.helpers
              .authenticate(user)
              .then(function() {
                API.resources.locations
                  .firstMile()
                  .getOne()
                  .expect(200)
                  .then(function(response) {
                    var locations = response.body;
                    locations.should.not.be.undefined();
                    locations.length.should.greaterThanOrEqual(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get `last-mile` data.',
          function(done) {
            API.helpers
              .authenticate(user)
              .then(function() {
                API.resources.locations
                  .lastMile()
                  .getOne()
                  .expect(200)
                  .then(function(response) {
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
  });
});
