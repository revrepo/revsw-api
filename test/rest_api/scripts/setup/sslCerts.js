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

var config = require('config');
var API = require('./../../common/api');
var Constants = require('./../../common/constants');
var SSLCertDP = require('./../../common/providers/data/sslCerts');

describe('Setup', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];

  var buildPrefix = function (user) {
    var tmp = 'qa-' + user.role + '-';
    return tmp.toLowerCase().replace(/\W/g, '-');
  };

  describe('SSL Certs', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {


        it('should create required items for pagination.',
          function (done) {

            API.helpers
              .authenticateUser(user)
              .then(function () {
                if (user.role === Constants.API.USERS.ROLES.ADMIN) {
                  return API.resources.users
                    .myself()
                    .getOne();
                }
                return API.helpers.accounts.createOne();
              })
              .then(function (response) {

                var sslCertsNeeded = [];
                var prefix = buildPrefix(user);
                var accountId;

                if (user.role === Constants.API.USERS.ROLES.ADMIN) {
                  accountId = response.body.companyId[0];
                }
                else {
                  accountId = response.id;
                }

                for (var i = 10; i < 40; i++) {
                  var cert = SSLCertDP.generateOne(accountId);
                  cert.cert_name = prefix + i;
                  sslCertsNeeded.push(cert);
                }

                API.resources.sslCerts
                  .getAll()
                  .expect(200)
                  .then(function (res) {

                    var existingSSLCerts = res.body;
                    var sslCertsToCreate = [];
                    var isAppNeeded;

                    for (var i = 0; i < sslCertsNeeded.length; i++) {

                      isAppNeeded = true;

                      for (var j = 0; j < existingSSLCerts.length; j++) {
                        if (sslCertsNeeded[i].cert_name ===
                          existingSSLCerts[j].cert_name) {
                          isAppNeeded = false;
                          break;
                        }
                      }

                      if (isAppNeeded) {
                        sslCertsToCreate.push(sslCertsNeeded[i]);
                      }
                    }

                    //console.log('SSL Certs to create');
                    //sslCertsToCreate.forEach(function (item) {
                    //  console.log('    >', item.app_name);
                    //});
                    //
                    //console.log('Existing SSL Certs');
                    //existingSSLCerts.forEach(function (app) {
                    //  console.log('    >', app.app_name);
                    //});

                    API.resources.sslCerts
                      .createManyIfNotExist(sslCertsToCreate)
                      .finally(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
