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
var config = require('config');
var API = require('./../../../common/api');
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');

describe('Functional check', function() {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));
  var credentionalsList = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user'),
    config.get('api.apikeys.admin'),
    config.get('api.apikeys.reseller')
  ];
  var gitHubPersonalAccessTokens = config.get('api.gitHubPersonalAccessTokenForAccountId');

  describe('Domain configs resource', function() {
    credentionalsList.forEach(function(credentionals) {
      describe('For credentional role -  ' + credentionals.role, function() {
        var testAccount = {
          companyName: credentionals.account.companyName,
          id: credentionals.account.id
        };
        before(function(done) {
          API.helpers
            .authenticate(credentionals)
            .then(function() {
              done();
            })
            .catch(done);
        });

        after(function(done) {
          API.session.reset();
          done();
        });

        describe('for GitHub Integration property in new domain', function() {
          var domainConfigData = {};
          var domainId;
          beforeEach(function(done) {
            API.helpers.domainConfigs.createOne(testAccount.id)
              .then(function(result) {
                domainId = result.id;
                return API.resources.domainConfigs
                  .getOne(result.id)
                  .then(function(data) {
                    domainConfigData = data.body;
                    // NOTE: clear not updated properties
                    delete domainConfigData.domain_name;
                    delete domainConfigData.cname;
                    delete domainConfigData.published_domain_version;
                    delete domainConfigData.last_published_domain_version;
                    return domainConfigData;
                  });
              })
              .then(function() {
                done();
              })
              .catch(done);
          });

          afterEach(function(done) {
            if (!domainId) {
              return done();
            }
            API.helpers
              .authenticate(credentionals)
              .then(function() {
                API.resources.domainConfigs.deleteOne(domainId);
              })
              .then(function() {
                done();
              })
              .catch(function() {
                done();
              });
          });

          it('should be able to update with valid not enabled GitHub Integration properties',
            function(done) {
              domainConfigData.github_integration = {
                enable: false,
                github_url: '',
                github_personal_api_key: ''
              };
              API.resources.domainConfigs
                .update(domainId, domainConfigData)
                .expect(200)
                .then(function() {
                  done();
                })
                .catch(function(err) {
                  done(err);
                });
            });

          it('should be able to success update domain config with enabled GitHub Integration properties',
            function(done) {
              domainConfigData.github_integration = {
                enable: true,
                github_url: gitHubPersonalAccessTokens[testAccount.id].valid_config,
                github_personal_api_key: gitHubPersonalAccessTokens[testAccount.id].token
              };
              API.resources.domainConfigs
                .update(domainId, domainConfigData)
                .expect(200)
                .then(function() {
                  done();
                })
                .catch(function(err) {
                  done(err);
                });
            });

          it('should be able to success update domain config loaded from GitHub after disable GitHub Integration ',
            function(done) {
              domainConfigData.github_integration = {
                enable: true,
                github_url: gitHubPersonalAccessTokens[testAccount.id].valid_config,
                github_personal_api_key: gitHubPersonalAccessTokens[testAccount.id].token
              };
              API.resources.domainConfigs
                .update(domainId, domainConfigData)
                .expect(200)
                .then(function() {
                  domainConfigData.github_integration.enable = false;
                  return API.resources.domainConfigs
                    .update(domainId, domainConfigData)
                    .expect(200);
                })
                .then(function() {
                  done();
                })
                .catch(function(err) {
                  done(err);
                });
            });
        });

      });
    });
  });

});
