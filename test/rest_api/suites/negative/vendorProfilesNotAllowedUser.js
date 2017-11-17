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

describe('Negative check', function () {
  
  this.timeout(config.api.request.maxTimeout);

  var Admin = config.get('api.users.admin');

  after(function (done) {
    done();
  });

  describe('Vendor profile resource', function () {
    
    describe('With not-allowed user', function () {

      it('should return `Forbidden` response when getting all vendor profiles with Admin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .getAll()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when getting revapm vendor profile by name  with Admin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .vendorProfile()
                .getOne()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when getting nuubit vendor profile by name  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .vendorsProfile()
                .getOne()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when getting hooli vendor profile by name  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .vendorssProfile()
                .getOne()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when getting revapm vendor profile by id  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .vendorUrlProfile()
                .getOne()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response when getting nuubit vendor profile by id  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .vendorsUrlProfile()
                .getOne()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      xit('should return `Forbidden` response  when getting hooli vendor profile by id  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .vendorssUrlProfile()
                .getOne()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when updating revapm vendor profile to hooli  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .updateVendorProfile()
                .update()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when updating nuubit vendor profile to revapm  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .updateVendorsProfile()
                .update()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when updating revapm vendor profile to nuubit  with revAdmin role', 
        function (done) {
          API.helpers
            .authenticateUser(Admin)
            .then(function () {
              API.resources.vendorProfiles
                .updateVendorssProfile()
                .update()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });
    });
  });
});
