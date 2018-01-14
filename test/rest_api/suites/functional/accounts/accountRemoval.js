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
          done();
        })
        .catch(done);
    });

    it('should return `400 Bad Request` when deleting an account with domains, apps, dns zones..',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            API.resources.accounts
              .deleteOne(testAccount.id)
              .expect(400)
              .end(done);
          })
          .catch(done);
      });

    it('should return `200 OK` when deleting an account after ' +
      'deleting it\'s domains, apps, dns zones..',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            return API
              .helpers
              .dnsZones
              .cleanup(testDNSZone.zone);
          })
          .then(function () {
            return API.resources.domainConfigs
              .deleteOne(testDomain.id)
              .expect(200);
          })
          .then(function () {
            return API.resources.apps
              .deleteOne(testApp.id)
              .expect(200);
          })
          .then(function () {
            // trying to delete the account after deleting all it's child objects
            API.resources.accounts
              .deleteOne(testAccount.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});

