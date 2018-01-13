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

var config = require('config');
var API = require('./../../../common/api');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var revAdmin = config.get('api.users.revAdmin');

  describe('Account Removal', function () {

    var testAccount;
    var testDomain;
    var testApp;
    var testDNSZone;

    before(function (done) {
      // prep an account
      API.helpers.authenticateUser(revAdmin)
        .then(function () {
          return API.helpers.accounts.createOne();
        })
        .then(function (acc) {
          testAccount = acc;
          return API.helpers.domainConfigs.createOne(testAccount.id);
        })
        .then(function (domain) {
          testDomain = domain;
          return API.helpers.apps.create({ accountId: testAccount.id });
        })
        .then(function (app) {
          testApp = app;
          return API.helpers.dnsZones.create(testAccount.id);
        })
        .then(function (dnszone) {
          testDNSZone = dnszone;
          // alright lets delete the account with auto removal on and test
          API.resources.accounts
            .deleteOne(testAccount.id, { auto_remove: true })
            .expect(200)
            .end(done);
        })
        .catch(done);

    });

    it('should return `400 Domain ID Not Found` response when getting domain after deleting it\'s account.',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            API.resources.domainConfigs
              .getOne(testDomain.id)
              .expect(400)
              .end(done);
          })
          .catch(done);
      });

    it('should return `400 App ID Not Found` response when getting app after deleting it\'s account.',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            API.resources.apps
              .getOne(testApp.id)
              .expect(400)
              .end(done);
          })
          .catch(done);
      });

    it('should return `400 DNS Zone ID Not Found` response when getting DNS zone after deleting it\'s account.',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            API.resources.dnsZones
              .getOne(testDNSZone.id)
              .expect(400)
              .end(done);
          })
          .catch(done);
      });
  });
});

