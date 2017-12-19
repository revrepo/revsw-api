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

  describe('Users managed domain_name', function() {
    var revAdmin = config.get('api.users.revAdmin');

    var userRolesList = [
      'user' //NOTE: role 'user' can have only one account
    ];
    var role = 'user';
    // userRolesList.forEach(function(role) {
    var accountMain = AccountsDP.generateOne();
    var managedDomainConfig, seccondDomainConfig;
    var newUserWithUserRole = DataProvider.generateUser(role);
    // Generating new `user` data in order to use later in our tests
    describe('Users resource for new user with role "' + role + '"', function() {
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
            return API.helpers.domainConfigs.createOne(accountMain.id, role + '-managed-domain')
              .then(function(domainConfig) {
                managedDomainConfig = domainConfig;
                return domainConfig;
              });
          })
          .then(function() {
            return API.helpers.domainConfigs.createOne(accountMain.id, role + '-managed-domain-seccond')
              .then(function(domainConfig) {
                seccondDomainConfig = domainConfig;
                return domainConfig;
              });
          })
          .then(function() {
            newUserWithUserRole.access_control_list.readOnly = false;
            newUserWithUserRole.companyId = [accountMain.id + ''];
            newUserWithUserRole.domain = [];
            return API.resources.users.createOne(newUserWithUserRole)
              .then(function(response) {
                newUserWithUserRole.id = response.body.object_id;
                newUserWithUserRole.name = newUserWithUserRole.email;
                return newUserWithUserRole;
              });
          })
          .then(function() {
            return API.resources.authenticate.createOne({
                email: newUserWithUserRole.email,
                password: newUserWithUserRole.password
              })
              .then(function(response) {
                newUserWithUserRole.token = response.body.token;
                return newUserWithUserRole;
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
            done();
          })
          .catch(done);
      });

      it('should return `Bad Request` then try create user with many managed domain names', function(done) {
        var newUser = DataProvider.generateUser(role);
        API.helpers
          .authenticateUser(revAdmin)
          .then(function() {
            newUser.access_control_list.readOnly = false;
            newUser.companyId = [accountMain.id + ''];
            newUser.domain = [managedDomainConfig.domain_name + '', seccondDomainConfig.domain_name + ''];
            return API.resources.users
              .createOne(newUser)
              .expect(400)
              .then(function(response) {
                response.body.message.should.equal('User with this role cannot manage many domains');
                response.body.error.should.equal('Bad Request');
                return newUser;
              });
          })
          .then(function() {
            done();
          })
          .catch(done);
      });

      it('should return `Bad Request` then try update user with many managed domain names', function(done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function() {
            newUserWithUserRole.domain.push(managedDomainConfig.domain_name + '');
            newUserWithUserRole.domain.push(seccondDomainConfig.domain_name + '');
            return API.resources.users
              .update(newUserWithUserRole.id, newUserWithUserRole)
              .expect(400)
              .then(function(response) {
                response.body.message.should.equal('User with this role cannot manage many domains');
                response.body.error.should.equal('Bad Request');
                return newUserWithUserRole;
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
