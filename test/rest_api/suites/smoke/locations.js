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

// # Smoke check: locations
var config = require('config');

var API = require('./../../common/api');

describe('Smoke check', function() {
  this.timeout(config.get('api.request.maxTimeout'));

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var resellerUser = config.get('api.users.reseller');
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user'),
    config.get('api.apikeys.admin'),
    config.get('api.apikeys.reseller')
//    config.get('api.users.roUser')   // TODO: need to add RO users for every role. 
// Or better we need to automatically create necessary test users...
  ];

  users.forEach(function(user) {

    describe('With user: ' + user.role, function() {

      before(function(done) {
        done();
      });

      after(function(done) {
        done();
      });

      describe('Locations resource', function() {
        it('should return a response when getting `first-mile`.',
          function(done) {
            API.helpers
              .authenticateUser(user)
              .then(function() {
                API.resources.locations
                  .firstMile()
                  .getOne()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting `last-mile`.',
          function(done) {
            API.helpers
              .authenticateUser(user)
              .then(function() {
                API.resources.locations
                  .lastMile()
                  .getOne()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting `billing_zones`.',
          function(done) {
            API.helpers
              .authenticateUser(user)
              .then(function() {
                API.resources.locations
                  .billingZones()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});
