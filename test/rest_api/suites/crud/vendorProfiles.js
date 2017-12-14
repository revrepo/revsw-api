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
var AccountsDP = require('./../../common/providers/data/accounts');
var DataProvider = require('./../../common/providers/data');

describe('CRUD check', function () {
  this.timeout(config.api.request.maxTimeout);

  var revAdmin = config.get('api.users.revAdmin');

  after(function (done) {
    done();
  });

  describe('Vendor profile resource', function () {

    it('should get vendor profile names list with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .getAll()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should get revapm vendor profile  by name with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .vendorProfile()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should get nuubit vendor profile by name with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .vendorsProfile()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should get hooli vendor profile by name with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .vendorssProfile()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should get revapm vendor profile  by id with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .vendorUrlProfile()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should get nuubit vendor profile  by id with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .vendorsUrlProfile()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should get hooli vendor profile  by id with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .vendorssUrlProfile()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should update revapm vendor profile to hooli by name with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .updateVendorProfile()
              .update()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should update nuubit vendor profile to revapm by name with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .updateVendorsProfile()
              .update()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should update revapm vendor profile to nuubit  by name with revAdmin role',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.vendorProfiles
              .updateVendorssProfile()
              .update()
              .expect(200)
              .then(function (res) {
                res.body.should.be.not.empty();
                res.body.vendor.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});

