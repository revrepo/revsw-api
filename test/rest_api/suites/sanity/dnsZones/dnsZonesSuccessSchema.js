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
var Joi = require('joi');

var config = require('config');
var API = require('./../../../common/api');
var DNSZonesDP = require('./../../../common/providers/data/dnsZones');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    var account;
    var firstDnsZone;
    var firstDnsZoneRecord;

    describe('With user: ' + user.role, function () {

      describe('DNS Zones resource', function () {
        describe('Success Response Data Schema', function () {

          before(function (done) {
            API.helpers
              .authenticateUser(user)
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

          it('should return response when getting all of DNS zones',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dnsZones
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZones = response.body;
                  var schema = API.providers.schema.dnsZones
                    .getForGetAll()
                    .response;
                  Joi.validate(dnsZones, schema, done);
                })
                .catch(done);
            });

          it('should return response when getting all DNS zones with usage stats',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dnsZones
                    .usage()
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZones = response.body;
                  var schema = API.providers.schema.dnsZones.stats.usage
                    .getForGetAll()
                    .response;
                  Joi.validate(dnsZones, schema, done);
                })
                .catch(done);
            });

          it('should return a response when getting a specific DNS zone',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dnsZones
                    .getOne(firstDnsZone.id)
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZone = response.body;
                  var schema = API.providers.schema.dnsZones
                    .getForGetOne()
                    .response;
                  Joi.validate(dnsZone, schema, done);
                })
                .catch(done);
            });

          it('should return a response when creating specific DNS zone',
            function (done) {
              var originalDnsZone;
              var dnsZone = DNSZonesDP.generateOne(account.id);
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dnsZones
                    .createOne(dnsZone)
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZone = response.body;
                  originalDnsZone = dnsZone;
                  var schema = API.providers.schema.dnsZones
                    .getForCreate()
                    .response;
                  var isValid = Joi.validate(dnsZone, schema).error === null;
                  isValid.should.be.true();
                })
                .then(function () {
                  API.helpers.dnsZones
                    .cleanup(new RegExp(originalDnsZone.zone))
                    .finally(done);
                })
                .catch(done);
            });

          it('should return a response when updating specific DNS zone',
            function (done) {
              var originalDnsZone;
              var updatedDnsZone = DNSZonesDP.generateToUpdate();
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.helpers.dnsZones.create(account.id);
                })
                .then(function (dnsZone) {
                  originalDnsZone = dnsZone;
                  return API.resources.dnsZones
                    .update(dnsZone.id, updatedDnsZone)
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZone = response.body;
                  var schema = API.providers.schema.dnsZones
                    .getForUpdate()
                    .response;
                  var isValid = Joi.validate(dnsZone, schema).error === null;
                  isValid.should.be.true();
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
                .authenticateUser(user)
                .then(function () {
                  return API.helpers.dnsZones.create(account.id);
                })
                .then(function (dnsZone) {
                  return API.resources.dnsZones
                    .deleteOne(dnsZone.id)
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZone = response.body;
                  var schema = API.providers.schema.dnsZones
                    .getForDelete()
                    .response;
                  Joi.validate(dnsZone, schema, done);
                })
                .catch(done);
            });

          it('should return a response when checking integration with dns ' +
            'servers for specific DNS Zone',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dnsZones
                    .checkIntegration(firstDnsZone.id)
                    .dnsServers()
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZones = response.body;
                  var schema = API.providers.schema.dnsZones
                    .checkIntegration
                    .dnsServers
                    .getForGetAll()
                    .response;
                  Joi.validate(dnsZones, schema, done);
                })
                .catch(done);
            });

          it('should return a response when checking integration with records ' +
            ' for specific DNS Zone',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dnsZones
                    .checkIntegration(firstDnsZone.id)
                    .records()
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var dnsZones = response.body;
                  var schema = API.providers.schema.dnsZones
                    .checkIntegration
                    .records
                    .getForGetAll()
                    .response;
                  Joi.validate(dnsZones, schema, done);
                })
                .catch(done);
            });

          describe('DNS Zone Records', function () {

            it('should return a response when getting all DNS Zone Records',
              function (done) {
                API.helpers
                  .authenticateUser(user)
                  .then(function () {
                    return API.resources.dnsZones
                      .records(firstDnsZone.id)
                      .getAll()
                      .expect(200);
                  })
                  .then(function (response) {
                    var zoneRecords = response.body;
                    var schema = API.providers.schema.dnsZones.records
                      .getForGetAll()
                      .response;
                    Joi.validate(zoneRecords, schema, done);
                  })
                  .catch(done);
              });

            it('should return a response when getting specific DNS Zone Record',
              function (done) {
                API.helpers
                  .authenticateUser(user)
                  .then(function () {
                    return API.resources.dnsZones
                      .records(firstDnsZone.id)
                      .getOne(firstDnsZoneRecord.id)
                      .expect(200);
                  })
                  .then(function (response) {
                    var zoneRecord = response.body;
                    var schema = API.providers.schema.dnsZones.records
                      .getForGetOne()
                      .response;
                    Joi.validate(zoneRecord, schema, done);
                  })
                  .catch(done);
              });

            it('should return a response when creating a new DNS Zone Record',
              function (done) {
                var dnsZoneRecord = DNSZonesDP.records.generateOne(firstDnsZone.zone);
                API.helpers
                  .authenticateUser(user)
                  .then(function () {
                    return API.resources.dnsZones
                      .records(firstDnsZone.id)
                      .createOne(dnsZoneRecord)
                      .expect(200);
                  })
                  .then(function (response) {
                    var zoneRecord = response.body;
                    var schema = API.providers.schema.dnsZones.records
                      .getForCreate()
                      .response;
                    Joi.validate(zoneRecord, schema, done);
                  })
                  .catch(done);
              });

            it('should return a response when updating specific DNS Zone Record',
              function (done) {
                API.helpers
                  .authenticateUser(user)
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
                    return API.resources.dnsZones
                      .records(firstDnsZone.id)
                      .update(dnsZoneRecord.id, updateData)
                      .expect(200);
                  })
                  .then(function (response) {
                    var zoneRecord = response.body;
                    var schema = API.providers.schema.dnsZones.records
                      .getForUpdate()
                      .response;
                    Joi.validate(zoneRecord, schema, done);
                  })
                  .catch(done);
              });

            it('should return a response when deleting specific DNS Zone Record',
              function (done) {
                API.helpers
                  .authenticateUser(user)
                  .then(function () {
                    return API.helpers.dnsZones.records.create(firstDnsZone);
                  })
                  .then(function () {
                    return API.resources.dnsZones.getOne(firstDnsZone.id);
                  })
                  .then(function (res) {
                    var dnsZoneRecordId = DNSZonesDP.getLastRecord(res.body).id;
                    return API.resources.dnsZones
                      .records(firstDnsZone.id)
                      .deleteOne(dnsZoneRecordId)
                      .expect(200);
                  })
                  .then(function (response) {
                    var zoneRecord = response.body;
                    var schema = API.providers.schema.dnsZones.records
                      .getForDelete()
                      .response;
                    Joi.validate(zoneRecord, schema, done);
                  })
                  .catch(done);
              });
          });
        });
      });
    });
  });
});
