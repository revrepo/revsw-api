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

describe('Setup', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    // config.get('api.users.admin') // ADMIN user cannot create account
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  var buildPrefix = function (user) {
    var tmp = 'qa-' + user.role + '-';
    return tmp.toLowerCase().replace(/\W/g, '-');
  };

  describe('Accounts', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {


        it('should create required items for pagination.',
          function (done) {

            API.helpers
              .authenticateUser(user)
              .then(function () {

                var accountsNeeded = [];
                var prefix = buildPrefix(user);

                for (var i = 10; i < 40; i++) {
                  accountsNeeded.push({
                    companyName: prefix + i
                  });
                }

                API.resources.accounts
                  .getAll()
                  .expect(200)
                  .then(function (res) {

                    var existingAccounts = res.body;
                    var accountsToCreate = [];
                    var isAccountNeeded;

                    for (var i = 0; i < accountsNeeded.length; i++) {

                      isAccountNeeded = true;

                      for (var j = 0; j < existingAccounts.length; j++) {
                        if (accountsNeeded[i].companyName ===
                          existingAccounts[j].companyName) {
                          isAccountNeeded = false;
                          break;
                        }
                      }

                      if (isAccountNeeded) {
                        accountsToCreate.push(accountsNeeded[i]);
                      }
                    }

                    API.resources.accounts
                      .createManyIfNotExist(accountsToCreate)
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
