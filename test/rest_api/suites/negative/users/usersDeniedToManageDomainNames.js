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

var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var DataProvider = require('./../../../common/providers/data');

describe('Negative check', function() {
  this.timeout(config.api.request.maxTimeout);

  describe('Users Additional Accounts To Manage ', function() {
    var revAdmin = config.get('api.users.revAdmin');

    var userRolesList = [
      'admin',
      'user'
    ];

    userRolesList.forEach(function(role) {
      var accountMain = AccountsDP.generateOne();
      var accountAdditional = AccountsDP.generateOne();
      var managedDomainConfig, additionalDomainConfig;
      var newUser = DataProvider.generateUser(role);
      describe('for user with role "' + role + '"', function() {
        before(function(done) {
          API.helpers
            .authenticateUser(revAdmin)
            .then(function() {
              return API.resources.accounts.createOne(accountMain)
                .then(function(response) {
                  accountMain.id = response.body.object_id;
                  return accountMain;
                });
            })
            .then(function() {
              return API.resources.accounts.createOne(accountAdditional)
                .then(function(response) {
                  accountAdditional.id = response.body.object_id;
                  return accountAdditional;
                });
            })
            .then(function() {
              return API.helpers.domainConfigs.createOne(accountMain.id, role + '-managed-domain')
                .then(function(domainConfig) {
                  managedDomainConfig = domainConfig;
                  return domainConfig;
                });
            })
            .then(function() {
              return API.helpers.domainConfigs.createOne(accountAdditional.id, role + '-additional-domain')
                .then(function(domainConfig) {
                  additionalDomainConfig = domainConfig;
                  return domainConfig;
                });
            })
            .then(function() {
              done();
            })
            .catch(done);
        });

        after(function(done) {
          API.helpers
            .authenticateUser(revAdmin)
            .then(function() {
              return API.resources.domainConfigs.deleteOne(managedDomainConfig.id);
            })
            .then(function() {
              return API.resources.domainConfigs.deleteOne(additionalDomainConfig.id);
            })
            .then(function() {
              return API.resources.accounts.deleteOne(accountMain.id);
            })
            .then(function() {
              return API.resources.accounts.deleteOne(accountAdditional.id);
            })
            .then(function() {
              done();
            })
            .catch(done);
        });        
      });
    });
  });
});
