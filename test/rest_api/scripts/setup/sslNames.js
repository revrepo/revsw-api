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
var SSLNameDP = require('./../../common/providers/data/sslNames');
describe('Setup', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];

  var buildPrefix = function (user) {
    var tmp = 'qa-' + user.role + '-';
    return tmp.toLowerCase().replace(/\W/g, '-');
  };

  describe('SSL Names', function () {

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

                var sslNamesNeeded = [];
                var prefix = buildPrefix(user);
                var accountId;

                if (user.role === Constants.API.USERS.ROLES.ADMIN) {
                  accountId = response.body.companyId[0];
                }
                else {
                  accountId = response.id;
                }

                for (var i = 10; i < 40; i++) {
                  sslNamesNeeded.push(SSLNameDP.generateOne(accountId, prefix + i));
                }

                API.resources.sslNames
                  .getAll()
                  .expect(200)
                  .then(function (res) {

                    var existingSSLNames = res.body;
                    var sslNamesToCreate = [];
                    var isSSLNameNeeded;

                    for (var i = 0; i < sslNamesNeeded.length; i++) {

                      isSSLNameNeeded = true;

                      for (var j = 0; j < existingSSLNames.length; j++) {
                        existingSSLNames[j].ssl_name
                        if (sslNamesNeeded[i].ssl_name ===
                          existingSSLNames[j].ssl_name) {
                          isSSLNameNeeded = false;
                          break;
                        }
                      }

                      if (isSSLNameNeeded) {
                        sslNamesToCreate.push(sslNamesNeeded[i]);
                      }
                    }

                    console.log('sslNamesToCreate', sslNamesToCreate);
                    //TODO: We have limitation with SSL cert (50 names)
                    //API.resources.sslNames
                    //  .createManyIfNotExist(sslNamesToCreate)
                    //  .finally(done);
                    done(); // Temporally added, related to above TODO
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
