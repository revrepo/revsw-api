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

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var user = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.helpers.apiKeys.createOne();
      })
      .then(function (key) {
        apiKey = key;
        accountId = apiKey.account_id;
        done();
      })
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(function () {
        API.resources.apiKeys.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('API Keys resource', function () {

    xit('should return a success response when getting all API Keys.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.apiKeys
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    xit('should return a success response when getting specific API Key.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.apiKeys
              .getOne(apiKey.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    xit('should return a success response when creating specific API Key.',
      function (done) {
        var newApiKey = APIKeyDataProvider.generateOne(accountId);
        API.helpers
          .authenticateUser(user)
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

    it('should return a success response when updating specific AI Key.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.apiKeys.createOne();
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

    xit('should return a success response when deleting a API Key.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.apiKeys.createOne();
          })
          .then(function (key) {
            API.resources.apiKeys
              .deleteOne(key.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    //xit('should return a success response when getting config-status of a ' +
    //  'API Key.',
    //  function (done) {
    //    API.helpers
    //      .authenticateUser(user)
    //      .then(function () {
    //        API.resources.apiKeys
    //          .configStatus(apiKey.id)
    //          .getAll()
    //          .expect(200)
    //          .end(done);
    //      })
    //      .catch(done);
    //  });
  });
});

