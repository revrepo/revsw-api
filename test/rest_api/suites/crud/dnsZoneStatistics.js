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


describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin')
  ];

  users.forEach(function (user) {

    var account;
    var firstDnsZone;
    var firstDnsZoneRecord;

    describe('With user: ' + user.role, function () {

      describe('DNS Zones Statistics resource', function () {

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

              
        it('should return a response when getting a specific DNS zone with usage stats and period last 24h',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.dnsZones
                  .stats_usage(firstDnsZone.id)
                  .getOne()
                  .expect(200)
                  .then(function (res) {
                    res.body.should.be.not.empty();
                    res.body.metadata.period.should.be.not.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should return a response when getting a specific DNS zone with usage stats and period last 1h',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.dnsZones
                  .stats_usages(firstDnsZone.id)
                  .getOne()
                  .expect(200)
                  .then(function (res) {
                    res.body.should.be.not.empty();
                    res.body.metadata.period.should.be.not.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should return a response when getting a specific DNS zone with usage stats and period last 30d',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.dnsZones
                  .statss_usage(firstDnsZone.id)
                  .getOne()
                  .expect(200)
                  .then(function (res) {
                    res.body.should.be.not.empty();
                    res.body.metadata.period.should.be.not.empty();
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
