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

var config = require('config');
var API = require('./../../common/api');
var DNSZonesDP = require('./../../common/providers/data/dnsZones');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDnsZone;
  var reseller = config.get('api.users.reseller');
  var revAdmin = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(revAdmin)
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('DNS Zones resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return success response code when getting a list of dns zones', function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.dnsZones
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
    });

    it('should return success response code when creating a new dns zone', function (done) {
        firstDnsZone = DNSZonesDP.generateOne(account.id);
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.dnsZones
              .createOne(firstDnsZone)
              .expect(200)
              .then(function (res) {
                done();
              })
              .catch(done);
          })
          .catch(done);
    });

    it('should return a recently created dns zone when getting a list of dns zones', function (done) {
      API.helpers
        .authenticateUser(reseller)
        .then(function () {
          API.resources.dnsZones
            .getAll()
            .expect(200)
            .then(function(res) {
              res.body.length.should.be.above(0);
              done();
            });
        })
        .catch(done);
    });

    it('should return success response code when deleting a dns zone', function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.dnsZones
              .deleteOne(firstDnsZone.dns_zone)
              .expect(200)
              .end(done);
          })
          .catch(done);
    });

  });
});
