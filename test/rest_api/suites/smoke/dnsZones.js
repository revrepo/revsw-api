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

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.reseller'),
    config.get('api.apikeys.reseller'),
    config.get('api.apikeys.admin')
  ];

  users.forEach(function (user) {

    var account;
    var firstDnsZone;
    var firstDnsZoneRecord;

    describe('With user: ' + user.role, function () {

      describe('DNS Zones resource', function () {

        before(function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {              
              if (user.key) {
                return user.account;
              } else {
                return API.helpers.accounts.createOne();
              }              
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

        it('should return response when getting all of DNS zones',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.dnsZones
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return response when getting all DNS zones with usage stats',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.dnsZones
                  .usage()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting a specific DNS zone',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.dnsZones
                  .getOne(firstDnsZone.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when creating specific DNS zone',
          function (done) {
            var dnsZone = DNSZonesDP.generateOne(account.id);
            API.helpers
              .authenticate(user)
              .then(function () {
                return API.resources.dnsZones
                  .createOne(dnsZone)
                  .expect(200);
              })
              .then(function () {
                API.helpers.dnsZones
                  .cleanup(new RegExp(dnsZone.zone))
                  .finally(done);
              })
              .catch(done);
          });

        it('should return a response when updating specific DNS zone',
          function (done) {
            var originalDnsZone;
            var updatedDnsZone = DNSZonesDP.generateToUpdate();
            API.helpers
              .authenticate(user)
              .then(function () {
                return API.helpers.dnsZones.create(account.id);
              })
              .then(function (dnsZone) {
                originalDnsZone = dnsZone;
                return API.resources.dnsZones
                  .update(dnsZone.id, updatedDnsZone)
                  .expect(200);
              })
              .then(function () {
                API.helpers.dnsZones
                  .cleanup(new RegExp(originalDnsZone.zone))
                  .finally(done);
              })
              .catch(done);
          });

        it('should return a response when deleting specific DNS zone',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                return API.helpers.dnsZones.create(account.id);
              })
              .then(function (dnsZone) {
                API.resources.dnsZones
                  .deleteOne(dnsZone.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when checking integration with dns ' +
          'servers for specific DNS Zone',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.dnsZones
                  .checkIntegration(firstDnsZone.id)
                  .dnsServers()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when checking integration with records ' +
          ' for specific DNS Zone',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.dnsZones
                  .checkIntegration(firstDnsZone.id)
                  .records()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a success response when auto discovering DNS zones',
          function (done) {
            this.timeout(900000); // auto discovering takes a long time (15min)
            API.helpers.authenticate(user).then(function () {
              API.resources.dnsZones
                .autoDiscover()
                .getOne('google.com') // testing a real domain
                .expect(200)
                .end(done);
            });
          });

        describe('DNS Zone Records', function () {

          it('should return a response when getting all DNS Zone Records',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  API.resources.dnsZones
                    .records(firstDnsZone.id)
                    .getAll()
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });

          it('should return a response when getting specific DNS Zone Record',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  API.resources.dnsZones
                    .records(firstDnsZone.id)
                    .getOne(firstDnsZoneRecord.id)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });

          it('should return a response when creating a new DNS Zone Record',
            function (done) {
              var dnsZoneRecord = DNSZonesDP.records.generateOne(firstDnsZone.zone);
              API.helpers
                .authenticate(user)
                .then(function () {
                  API.resources.dnsZones
                    .records(firstDnsZone.id)
                    .createOne(dnsZoneRecord)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });

          it('should return a response when updating specific DNS Zone Record',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.helpers.dnsZones.records.create(firstDnsZone);
                })
                .then(function () {
                  return API.resources.dnsZones.getOne(firstDnsZone.id);
                })
                .then(function (res) {
                  var dnsZoneRecord = DNSZonesDP.getLastRecord(res.body);
                  var updateData = DNSZonesDP.records
                    .generateOneForUpdate(dnsZoneRecord);
                  API.resources.dnsZones
                    .records(firstDnsZone.id)
                    .update(dnsZoneRecord.id, updateData)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });

          it('should return a response when deleting specific DNS Zone Record',
            function (done) {
              API.helpers
                .authenticate(user)
                .then(function () {
                  return API.helpers.dnsZones.records.create(firstDnsZone);
                })
                .then(function () {
                  return API.resources.dnsZones.getOne(firstDnsZone.id);
                })
                .then(function (res) {
                  var dnsZoneRecordId = DNSZonesDP.getLastRecord(res.body).id;
                  API.resources.dnsZones
                    .records(firstDnsZone.id)
                    .deleteOne(dnsZoneRecordId)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });
        });
      });
    });
  });
});
