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

// # Smoke check: SSL certs
var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var SSLCertDataProvider = require('./../../common/providers/data/sslCerts');

var users = [
  config.get('api.users.revAdmin'),
  config.get('api.users.reseller'),
  config.get('api.apikeys.reseller'),
  config.get('api.apikeys.admin')
];

users.forEach(function (user) {
  describe('Smoke check with ' + user.role, function () {
    this.timeout(config.get('api.request.maxTimeout'));
  
    // Shared variables
    var sslCert;
    var accountId;

    before(function (done) {
      API.helpers
        .authenticate(user)
        .then(function () {
          return API.helpers.sslCerts.createOne(user.key ? user.account.id : undefined);
        })
        .then(function (certificate) {
          sslCert = certificate;
          accountId = sslCert.account_id;
          done();
        })
        .catch(done);
    });
  
    after(function (done) {
      done();
    });
  
    describe('SSL Certificates resource', function () {
  
      it('should return a success response when getting all SSL certs.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.sslCerts
                .getAll()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
  
      it('should return a success response when getting specific SSL cert.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.sslCerts
                .getOne(sslCert.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
  
      it('should return a success response when creating specific SSL cert.',
        function (done) {
          var certificate = SSLCertDataProvider.generateOne(accountId);
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.sslCerts
                .createOne(certificate)
                .expect(200)
                .then(function (response) {
                  API.resources.sslCerts
                    .deleteOne(response.body.id)
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            })
            .catch(done);
        });
  
      it('should return a success response when updating specific SSL cert.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              return API.helpers.sslCerts.createOne(user.key ? user.account.id : undefined);
            })
            .then(function (certificate) {
              var certificateId = certificate.id;
              certificate.cert_name += 'UPDATED';
              delete certificate.id;
  
              API.resources.sslCerts
                .update(certificateId, certificate)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
  
      it('should return a success response when deleting a SSL cert.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              return API.helpers.sslCerts.createOne(user.key ? user.account.id : undefined);
            })
            .then(function (certificate) {
              API.resources.sslCerts
                .deleteOne(certificate.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
  
      it('should return a success response when getting config-status of a ' +
        'SSL cert.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.sslCerts
                .configStatus(sslCert.id)
                .getAll()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
    });
  });
  
  
});