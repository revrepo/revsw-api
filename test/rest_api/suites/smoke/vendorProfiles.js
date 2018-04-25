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
var should = require('should');
var config = require('config');

var Constants = require('./../../common/constants');
var API = require('./../../common/api');
var AccountsDP = require('./../../common/providers/data/accounts');
var DataProvider = require('./../../common/providers/data');
var revAdmin = config.get('api.users.revAdmin');
var runs = [
  config.get('api.users.reseller'),
  config.get('api.users.revAdmin')
];
runs.forEach(function (run) {
  describe('Smoke check with ' + run.role, function () {
    this.timeout(config.api.request.maxTimeout);
    var vendors = Constants.API.VENDORS;
    var testUser;

    before(function (done) {
      API.helpers
        .authenticate(run)
        .then(function () {
          return API.helpers.accounts.createOne();
        })
        .then(function (acc) {
          return API.helpers.users.create({ account_id: acc.id });
        })
        .then(function (user) {
          testUser = user;
          done();
        })
        .catch(done);
    });

    describe('Vendor profile resource', function () {

      it('should return a response containing all the expected vendors', function (done) {
        API.helpers
          .authenticate(revAdmin)
          .then(function () {
            API.helpers.vendors.getAllVendors().then(function (res) {
              res.forEach(function (vendor) {
                vendors.indexOf(vendor).should.not.equal(-1);
              });
              vendors.length.should.equal(res.length);
              done();
            });
          })
          .catch(done);
      });

      vendors.forEach(function (vendor) {
        it('should return a response containing expected data for ' + vendor + ' vendor',
          function (done) {
            API.helpers
              .authenticate(run)
              .then(function () {
                API.helpers.vendors.getVendorByName(vendor).then(function (res) {
                  done();
                  vendor
                    .should
                    .equal(res.vendor === undefined ?
                      res.companyNameShort.toLowerCase().replace(/[^a-zA-Z ]/g, '') :
                      res.vendor);
                });
              })
              .catch(done);
          });
      });

      vendors.forEach(function (vendor) {
        it('should successfully update user\'s account vendor to ' + vendor,
          function (done) {
            API.helpers
              .authenticate(revAdmin)
              .then(function () {
                API
                  .helpers
                  .vendors
                  .updateVendorProfile(testUser.account_id, vendor).then(function (res) {
                    res.statusCode.should.equal(200);
                    API.resources.accounts
                      .getOne(testUser.account_id)
                      .expect(200)
                      .then(function (res) {
                        res.body.vendor_profile.should.equal(vendor);
                        done();
                      })
                      .catch(done);
                  });
              })
              .catch(done);
          });
      });
    });
  });

});

