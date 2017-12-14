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

var config = require('config');
var API = require('./../../common/api');
var DNSZonesDP = require('./../../common/providers/data/dnsZones');
var DNSZoneStatisticsDP = require('./../../common/providers/data/dnsZoneStatistics');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    var account;
    var firstDnsZone;
    var firstDnsZoneRecord;


    describe('With user: ' + user.role, function () {

      describe('DNS Zones Statistics resource', function () {

        before(function (done) {
          API.identity
            .authenticate(user)
            .then(function () {
              return API.helpers.accounts.createOne();
            })
            .then(function (newAccount) {
              account = newAccount;
              return API.helpers.dnsZones.create(account.id);
            })
            .then(function (dnsZone) {
              firstDnsZone = dnsZone;
              return API.helpers.dnsZones.records.create(firstDnsZone);
            })
            .then(function (dnsZoneRecord) {
              firstDnsZoneRecord = dnsZoneRecord;
            })
            .then(done)
            .catch(done);
        });

        after(function (done) {
          API.helpers.dnsZones
            .cleanup(new RegExp(firstDnsZone.zone))
            .finally(done);
        });

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

        it('should return a response when getting a specific DNS zone with ' +
          'usage stats and period last 24h with user-role user',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                var period = DNSZoneStatisticsDP.generatePeriod();
                API.resources.dnsZones
                  .usage(firstDnsZone.id)
                  .getOne(firstDnsZone.id, period)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting a specific DNS zone with ' +
          'usage stats and period last 1h with user-role user',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                var period = DNSZoneStatisticsDP.generateOne();
                API.resources.dnsZones
                  .usage(firstDnsZone.id)
                  .getOne(firstDnsZone.id, period)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting a specific DNS zone with ' +
          'usage stats and period last 30d with user-role user',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                var period = DNSZoneStatisticsDP.generateTwo();
                API.resources.dnsZones
                  .usage(firstDnsZone.id)
                  .getOne(firstDnsZone.id, period)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});
