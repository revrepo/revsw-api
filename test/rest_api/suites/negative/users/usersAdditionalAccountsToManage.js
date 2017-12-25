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
      var managedDomainConfig, seccondDomainConfig;
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
              done();
            })
            .catch(done);
        });

        after(function(done) {
          API.helpers
            .authenticateUser(revAdmin)
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

        it('should return `Bad Request` when try create user with many managed Accounts ID', function(done) {
          var newUser = DataProvider.generateUser(role);
          API.helpers
            .authenticateUser(revAdmin)
            .then(function() {
              newUser.access_control_list.readOnly = false;
              newUser.companyId = [accountMain.id + '', accountAdditional.id + ''];
              return API.resources.users
                .createOne(newUser)
                .expect(400)
                .then(function(response) {
                  response.body.message.should.equal('User with role "' + role + '" cannot manage other accounts');
                  response.body.error.should.equal('Bad Request');
                  return newUser;
                });
            })
            .then(function() {
              done();
            })
            .catch(done);
        });

        it('should return `Bad Request` then try update user with many managed Accounts ID', function(done) {
          API.helpers
            .authenticateUser(revAdmin)
             .then(function() {
              newUser.access_control_list.readOnly = false;
              newUser.companyId = [accountMain.id + ''];
              newUser.domain = [];
              return API.resources.users.createOne(newUser)
                .then(function(response) {
                  newUser.id = response.body.object_id;
                  newUser.name = newUser.email;
                  return newUser;
                });
            })
            .then(function() {
              newUser.companyId.push(accountAdditional.id + '');
              return API.resources.users
                .update(newUser.id, newUser)
                .expect(400)
                .then(function(response) {
                  response.body.message.should.equal('User with role "' + role + '" cannot manage other accounts');
                  response.body.error.should.equal('Bad Request');
                  return newUser;
                });
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
