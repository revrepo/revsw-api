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
var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // var reseller = config.get('api.users.reseller');
  // var revAdmin = config.get('api.users.revAdmin');

  var users = [
    config.get('api.users.reseller')
  ];
  var errorResponseSchema = SchemaProvider.getErrorResponse();

  users.forEach(function (user) {

    var account;
    var firstDnsZone;
    var firstDnsZoneRecord;

    describe('With user: ' + user.role, function () {

      describe('DNS Zones resource', function () {
        describe('Error Response Data Schema', function () {

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
            API.identity
              .authenticate(user)
              .then(function () {
                API.helpers.dnsZones
                  .cleanup(new RegExp(firstDnsZone.zone))
                  .finally(done);
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return response applying `error response` schema when ' +
            'getting all of DNS zones without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dnsZones
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return response applying `error response` schema when ' +
            'getting all DNS zones with usage stats without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dnsZones
                .usage()
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return a response applying `error response` schema when ' +
            'getting a specific DNS zone without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dnsZones
                .getOne(firstDnsZone.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return a response applying `error response` schema when ' +
            'creating specific DNS zone without authentication.',
            function (done) {
              var dnsZone = DNSZonesDP.generateOne(account.id);
              API.session.reset();
              API.resources.dnsZones
                .createOne(dnsZone)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return a response applying `error response` schema when ' +
            'updating specific DNS zone without authentication.',
            function (done) {
              var updatedDnsZone = DNSZonesDP.generateToUpdate();
              API.session.reset();
              API.resources.dnsZones
                .update(firstDnsZone.id, updatedDnsZone)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return a response applying `error response` schema when ' +
            'deleting specific DNS zone without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dnsZones
                .deleteOne(firstDnsZone.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return a response applying `error response` schema when ' +
            'checking integration with dns servers for specific DNS Zone ' +
            'without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dnsZones
                .checkIntegration(firstDnsZone.id)
                .dnsServers()
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return a response applying `error response` schema when ' +
            'checking integration with records for specific DNS Zone without ' +
            'authentication.',
            function (done) {
              API.session.reset();
              API.resources.dnsZones
                .checkIntegration(firstDnsZone.id)
                .records()
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          describe('DNS Zone Records', function () {

            it('should return a response applying `error response` schema ' +
              'when getting all DNS Zone Records without authentication.',
              function (done) {
                API.session.reset();
                API.resources.dnsZones
                  .records(firstDnsZone.id)
                  .getAll()
                  .expect(401)
                  .then(function (response) {
                    var data = response.body;
                    Joi.validate(data, errorResponseSchema, done);
                  })
                  .catch(done);
              });

            it('should return a response applying `error response` schema ' +
              'when getting specific DNS Zone Record without authentication.',
              function (done) {
                API.session.reset();
                API.resources.dnsZones
                  .records(firstDnsZone.id)
                  .getOne(firstDnsZoneRecord.id)
                  .expect(401)
                  .then(function (response) {
                    var data = response.body;
                    Joi.validate(data, errorResponseSchema, done);
                  })
                  .catch(done);
              });

            it('should return a response applying `error response` schema ' +
              'when creating a new DNS Zone Record without authentication.',
              function (done) {
                var dnsZoneRecord = DNSZonesDP.records.generateOne(firstDnsZone.zone);
                API.session.reset();
                API.resources.dnsZones
                  .records(firstDnsZone.id)
                  .createOne(dnsZoneRecord)
                  .expect(401)
                  .then(function (response) {
                    var data = response.body;
                    Joi.validate(data, errorResponseSchema, done);
                  })
                  .catch(done);
              });

            it('should return a response applying `error response` schema ' +
              'when updating specific DNS Zone Record without authentication.',
              function (done) {
                var updateData = DNSZonesDP.records
                  .generateOneForUpdate(firstDnsZoneRecord);
                API.session.reset();
                API.resources.dnsZones
                  .records(firstDnsZone.id)
                  .update(firstDnsZoneRecord.id, updateData)
                  .expect(401)
                  .then(function (response) {
                    var data = response.body;
                    Joi.validate(data, errorResponseSchema, done);
                  })
                  .catch(done);
              });

            it('should return a response applying `error response` schema ' +
              'when deleting specific DNS Zone Record without authentication.',
              function (done) {
                API.session.reset();
                API.resources.dnsZones
                  .records(firstDnsZone.id)
                  .deleteOne(firstDnsZoneRecord.id)
                  .expect(401)
                  .then(function (response) {
                    var data = response.body;
                    Joi.validate(data, errorResponseSchema, done);
                  })
                  .catch(done);
              });
          });
        });
      });
    });
  });
});
