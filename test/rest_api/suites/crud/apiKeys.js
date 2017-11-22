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

// # CRUD check: API Keys
var config = require('config');

var API = require('./../../common/api');
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
    API.identity
      .authenticate(user)
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
    done();
  });

  describe('API Keys resource', function () {

    it('should allow to get all API Keys.',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            return API.resources.apiKeys
              .getAll()
              .expect(200);
          })
          .then(function (response) {
            var apiKeys = response.body;
            apiKeys.should.not.be.empty();
            apiKeys.length.should.greaterThan(0);
            done();
          })
          .catch(done);
      });

    it('should allow to get specific API Key.',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            return API.resources.apiKeys
              .getOne(apiKey.id)
              .expect(200);
          })
          .then(function (response) {
            response.body.id.should.equal(apiKey.id);
            done();
          })
          .catch(done);
      });

    it('should allow to create specific API Key.',
      function (done) {
        var newApiKey = APIKeyDataProvider.generateOne(accountId);
        API.identity
          .authenticate(user)
          .then(function () {
            return API.resources.apiKeys
              .createOne(newApiKey)
              .expect(200);
          })
          .then(function (response) {
            response.body.statusCode.should.equal(200);
            response.body.object_id.should.not.be.undefined();
            done();
          })
          .catch(done);
      });

    it('should allow to update specific API Key.',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            return API.helpers.apiKeys.createOne();
          })
          .then(function (key) {
            var apiKeyId = key.id;
            var updatedKey = APIKeyDataProvider
              .generateCompleteOne(key.account_id);
            return API.resources.apiKeys
              .update(apiKeyId, updatedKey)
              .expect(200);
          })
          .then(function (res) {
            res.body.statusCode.should.equal(200);
            res.body.message.should.equal('Successfully updated the API key');
            done();
          })
          .catch(done);
      });

    it('should allow to delete an API Key.',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            return API.helpers.apiKeys.createOne();
          })
          .then(function (key) {
            return API.resources.apiKeys
              .deleteOne(key.id)
              .expect(200);
          })
          .then(function (res) {
            res.body.statusCode.should.equal(200);
            res.body.message.should.equal('Successfully deleted the API key');
            done();
          })
          .catch(done);
      });
  });
});

