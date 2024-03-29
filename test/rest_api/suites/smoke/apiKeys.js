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

// # Smoke check: API Keys
var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var APIKeyDataProvider = require('./../../common/providers/data/apiKeys');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  // Shared variables
  var apiKey;
  var accountId;
  var account;

  // Retrieving information about specific user that later we will use for
  // our API requests.
  // TODO: need to add admin/reseller roles and also write negative tests for user role
  // and RO users
  var user = config.get('api.users.revAdmin');
  var users = [
    user,
    config.get('api.apikeys.admin'),
    config.get('api.apikeys.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {
    describe('With ' + user.role, function () {
      before(function (done) {
        API.helpers
          .authenticate(user)
          .then(function () {
            if (user.key || user.role === 'Admin') {
              return user.account;
            } else {
              return API.helpers.accounts.createOne();
            }
          })
          .then(function (acc) {
            account = acc;
            return API.helpers.apiKeys.createOneForAccount(acc);
          })
          .then(function (key) {
            apiKey = key;
            accountId = apiKey.account_id;            
            done();
          })
          .catch(done);
      });

      it('should return a success response when getting all API Keys.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.apiKeys
                .getAll()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return a success response when getting specific API Key.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.apiKeys
                .getOne(apiKey.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return a success response when creating specific API Key.',
        function (done) {
          var newApiKey = APIKeyDataProvider.generateOne(accountId);
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.apiKeys
                .createOne(newApiKey)
                .expect(200)
                .then(function (response) {
                  API.resources.apiKeys
                    .deleteOne(response.body.id)
                    .end(done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return a success response when updating specific API Key.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              return API.helpers.apiKeys.createOneForAccount(account);
            })
            .then(function (key) {
              var apiKeyId = key.id;
              var updatedKey = APIKeyDataProvider
                .generateCompleteOne(key.account_id);
              API.resources.apiKeys
                .update(apiKeyId, updatedKey)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

        it('should return a success response when updating specific API Key with domains.',
        function (done) {
          var apik;
          API.helpers
            .authenticate(user)
            .then(function () {
              return API.helpers.apiKeys.createOneForAccount(account);
            })
            .then(function (key) {
              apik = key;
              return API.helpers.domainConfigs.createOne(account.id, 'apikey-test');
            })
            .then(function (domain) {              
              apik.domains = [domain.id];
              return apik;
            })
            .then(function (key) {
              var apiKeyId = key.id;
              var updatedKey = APIKeyDataProvider
                .generateCompleteOne(key.account_id);
              API.resources.apiKeys
                .update(apiKeyId, updatedKey)
                .expect(200)
                .then(function () {
                  API.resources.domainConfigs
                    .deleteOne(key.domains[0])
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            })
            .catch(done);
        });



      it('should return a success response when deleting an API Key.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              return API.helpers.apiKeys.createOneForAccount(account);
            })
            .then(function (key) {
              API.resources.apiKeys
                .deleteOne(key.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return a success response when activating an API Key.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.apiKeys
                .activate(apiKey.id)
                .createOne()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return a success response when getting info about an API Key.',
        function (done) {
          API.resources.apiKeys
            .getOne(apiKey.id)
            .expect(200)
            .then(function (res) {
              API.helpers
                .authenticateAPIKey(res.body.id)
                .then(function () {
                  API.resources.apiKeys
                    .myself()
                    .getOne()
                    .expect(200)
                    .end(done);
                })
                .catch(done);
            });
        });

      it('should return a success response when deactivating an API Key.',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.apiKeys
                .deactivate(apiKey.id)
                .createOne()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
    });
  });
});
