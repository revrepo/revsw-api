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

describe('Clean up', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
    // config.get('api.users.admin') // ADMIN user cannot create account
  ];
  var pattern = /[0-9]{13}/;

  describe('Accounts', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean Accounts created for testing.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.accounts
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var ids = [];
                    var accounts = res.body;
                    accounts.forEach(function (account) {
                      if (pattern.test(account.companyName) ||
                        pattern.test(account.createdBy)) {
                        ids.push(account.id);
                      }
                    });

                    API.resources.accounts
                      .deleteManyIfExist(ids)
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
