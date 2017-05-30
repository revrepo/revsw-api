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
var Constants = require('./../../../common/constants');
var API = require('./../../../common/api');
var Utils = require('./../../../common/utils');
var DNSZonesDP = require('./../../../common/providers/data/dnsZones');

describe('DNS Zones resource: pre-requisites', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var dataTypes = [
    Constants.API.TEST_DATA_TYPES.EMPTY,
    Constants.API.TEST_DATA_TYPES.LONG,
    Constants.API.TEST_DATA_TYPES.SHORT
  ];
  var users = [
    config.get('api.users.reseller')
  ];
  var dnsZones = {};

  dataTypes.forEach(function (type) {

    before(function (done) {

      /**
       * Generates Spec name for the given data.
       *
       * @param type
       * @param field
       * @param value
       * @returns {string}
       */
      var getSpecName = function (type, field, value) {
        return 'should return error response when updating `DNS Zone` with ' +
          type + ' `' + field + '`: ' + value;
      };
      /**
       * Generates Spec function for the given data.
       *
       * @param user
       * @param model
       * @returns {Function}
       */
      var getSpecFn = function (user, field, model) {
        var fieldName = Utils.getLastKeyFromPath(field);
        return function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              var dnsZone = dnsZones[user.role];
              return API.resources.dnsZones.update(dnsZone.id, model);
            })
            .then(function (res) {
              res.body.statusCode.should.equal(400);
              res.body.message.should.containEql(fieldName);
              done();
            })
            .catch(done);
        };
      };

      DNSZonesDP.DataDrivenHelper.payload.genToUpdate(type,
        function (err, data) {

          users.forEach(function (user) {
            describe('Boundary check', function () {
              // Changing default mocha's timeout (Default is 2 seconds).
              this.timeout(config.get('api.request.maxTimeout'));
              describe('DNS Zones resource', function () {
                describe('With user: ' + user.role, function () {
                  describe('Update with `' + type + '` data', function () {

                    before(function (done) {
                      API.helpers
                        .authenticateUser(reseller)
                        .then(function () {
                          return API.helpers
                            .authenticateUser(user)
                            .then(function () {
                              return API.helpers.accounts.createOne();
                            })
                            .then(function (newAccount) {
                              accounts[user.role] = newAccount;
                              return API.helpers.dnsZones.create(newAccount.id);
                            })
                            .then(function (newDnsZone) {
                              dnsZones[user.role] = newDnsZone;
                              done();
                            });
                        })
                        .catch(done);
                    });

                    after(function (done) {
                      return API.helpers
                        .authenticateUser(user)
                        .then(function () {
                          API.helpers.dnsZones
                            .cleanup(dnsZones[user.role].zone)
                            .finally(done);
                        })
                        .catch(done);
                    });

                    data.forEach(function (dnsZone) {
                      var field = dnsZone.field;
                      var model = dnsZone.model;
                      var value = Utils.getValueByPath(model, field);

                      if (value === undefined || value === null) {
                        return;
                      }

                      it(
                        getSpecName(type, field, value),
                        getSpecFn(user, field, model)
                      );
                    });
                  });
                });
              });
            });
          });
          done();
        });
    });

    it('Generating `update-' + type + '-data` specs ...', function () {
      // Do not remove this spec as it is required to auto-generate other specs.
      Object.keys(dnsZones).length.should.be.above(0); // Pre-requisites check
    });
  });
});

