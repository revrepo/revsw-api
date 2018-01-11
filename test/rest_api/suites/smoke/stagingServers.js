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

// # Smoke check: SSL certs
var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var users = [
  config.get('api.users.revAdmin'),
  config.get('api.users.reseller'),
  config.get('api.users.admin'),
  config.get('api.users.user'),
  config.get('api.apikeys.reseller'),
  config.get('api.apikeys.admin')
];

users.forEach(function (user) {
  describe('Smoke check with ' + user.role, function() {
    this.timeout(config.get('api.request.maxTimeout'));

    it('should return a success response when getting all Staging Servers.',
      function(done) {
        API.helpers
          .authenticate(user)
          .then(function() {
            API.resources.stagingServers
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});

