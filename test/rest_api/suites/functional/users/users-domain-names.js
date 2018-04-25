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
var DELAY_AFTER_DELETE_DOMAIN_CONFIG_MS = 15 * 1000;

describe('Functional check', function() {
  this.timeout(config.api.request.maxTimeout);
  // deprecated
  xdescribe('Users managed domain_name', function() {
    var revAdmin = config.get('api.users.revAdmin');

    var userRolesList = [
      'reseller',
      'admin',
      // 'user' //NOTE: role 'user' can have only one account
    ];

    userRolesList.forEach(function(role) {
      var accountMain = AccountsDP.generateOne();
      var managedDomainConfig, deleteDomainConfig;
      var newUserWithRole = DataProvider.generateUser(role);
      // Generating new `user` data in order to use later in our tests.
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
              return API.helpers.domainConfigs.createOne(accountMain.id, role + '-managed-domain-delete')
                .then(function(domainConfig) {
                  deleteDomainConfig = domainConfig;
                  return domainConfig;
                });
            })
            .then(function() {
              newUserWithRole.account_id = accountMain.id;
              newUserWithRole.permissions.domains.list = [managedDomainConfig.id, deleteDomainConfig.id];
              return API.resources.users.createOne(newUserWithRole)
                .then(function(response) {
                  newUserWithRole.id = response.body.object_id;
                  newUserWithRole.name = newUserWithRole.email;
                  return newUserWithRole;
                });
            })
            .then(function() {
              return API.resources.authenticate.createOne({
                  email: newUserWithRole.email,
                  password: newUserWithRole.password
                })
                .then(function(response) {
                  newUserWithRole.token = response.body.token;
                  return newUserWithRole;
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

        it('should have access to managed domain names', function(done) {
          var userData;
          API.helpers
            .authenticateUser(newUserWithRole)
            .then(function() {
              return API.resources.users
                .myself()
                .getOne()
                .expect(200)
                .then(function(res) {
                  res.body.should.have.property('domain');
                  res.body.domain.should.be.instanceof(Array).and.have.lengthOf(2);
                  res.body.domain.should.containEql(managedDomainConfig.domain_name);
                  res.body.domain.should.containEql(deleteDomainConfig.domain_name);
                  userData = res.body;
                  return userData;
                })
                .then(function() {
                  return API.resources.domainConfigs
                    .getOne(managedDomainConfig.id)
                    .expect(200)
                    .then(function(res) {
                      res.body.should.have.property('domain_name');
                      res.body.domain_name.should.equal(managedDomainConfig.domain_name);
                    });
                })
                .then(function() {
                  return API.resources.domainConfigs
                    .getOne(deleteDomainConfig.id)
                    .expect(200)
                    .then(function(res) {
                      res.body.should.have.property('domain_name');
                      res.body.domain_name.should.equal(deleteDomainConfig.domain_name);
                    });
                });
            })
            .then(function() {
              done();
            })
            .catch(done);
        });

        describe('after delete managed domain', function() {
          before(function(done) {
            API.helpers
              .authenticateUser(revAdmin)
              .then(function() {
                return API.resources.domainConfigs
                  .deleteOne(deleteDomainConfig.id)
                  .expect(200);
              })
              .delay(DELAY_AFTER_DELETE_DOMAIN_CONFIG_MS)
              .then(function() {
                done();
              })
              .catch(done);
          });

          it('should no managed domain name wich was deleted', function(done) {

            API.helpers
              .authenticateUser(newUserWithRole)
              .then(function() {
                return API.resources.users
                  .myself()
                  .getOne()
                  .expect(200)
                  .then(function(res) {
                    res.body.should.have.property('domain');
                    res.body.domain.should.be.instanceof(Array).and.have.lengthOf(1);
                    res.body.domain.should.not.containEql(deleteDomainConfig.domain_name);
                    return res.body;
                  });
              })
              .then(function() {
                return API.resources.domainConfigs
                  .getOne(deleteDomainConfig.id)
                  .expect(400);
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
});
