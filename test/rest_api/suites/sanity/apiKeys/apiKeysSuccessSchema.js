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

require('should-http');
var Joi = require('joi');

var config = require('config');
var API = require('./../../../common/api');
var AppsDP = require('./../../../common/providers/data/apps');// TODO: delete
var APIKeyDP = require('./../../../common/providers/data/apiKeys');

var SchemaProvider = require('./../../../common/providers/schema');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    var testAccount;
    var testAPIKey;

    describe('With user: ' + user.role, function () {

      describe('API Key resource', function () {
        describe('Success Response Data Schema', function () {

          before(function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.helpers.accounts.createOne();
              })
              .then(function (newAccount) {
                testAccount = newAccount;
                return API.helpers.apiKeys.createOneForAccount(testAccount);
              })
              .then(function (apiKey) {
                testAPIKey = apiKey;
              })
              .then(done)
              .catch(done);
          });

          after(function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                // API.resources.apiKeys.deleteAllPrerequisites(done); // TODO-NOTE: don't use decause   BasicResource.deleteAllPrerequisites not works
                API.resources.apiKeys.deleteOne(testAPIKey.id).end(done);
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying apiKeys schema when getting all apiKeys.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apiKeys
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var apiKeys = response.body;
                  apiKeys.forEach(function (app) {
                    Joi.validate(app, SchemaProvider.getAPIKey(), function (err) {
                      if (err) {
                        return done(err);
                      }
                    });
                  });
                  done();
                })
                .catch(done);
            });

          it('should return data applying apiKey schema when getting specific ' +
            'apiKey',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apiKeys
                    .getOne(testAPIKey.id)
                    .expect(200);
                })
                .then(function (response) {
                  var apiKey = response.body;
                  Joi.validate(apiKey, SchemaProvider.getAPIKey(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'creating specific apiKey.',
            function (done) {
              var newAPIKey = APIKeyDP.generateOne(testAccount.id);
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apiKeys
                    .createOne(newAPIKey)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getCreateAPIKeyStatus(),
                    function (error) {
                      if (error) {
                        return done(error);
                      }
                      API.resources.apiKeys
                        .deleteOne(data.object_id)
                        .end(done);
                    });
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'updating specific apiKey.',
            function (done) {
              var newAPIKey = APIKeyDP.generateOne(testAccount.id);
              var updatedApp = APIKeyDP
                .generateCompleteOne(testAccount.id, 'UPDATED');
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apiKeys.createOneAsPrerequisite(newAPIKey);
                })
                .then(function (response) {
                  return API.resources.apiKeys
                    .update(response.body.object_id, updatedApp)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getSuccessResponse(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'deleting an apiKey.',
            function (done) {
              var newAPIKey = APIKeyDP.generateOne(testAccount.id);
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apiKeys.createOneAsPrerequisite(newAPIKey);
                })
                .then(function (response) {
                  return API.resources.apiKeys
                    .deleteOne(response.body.object_id)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getAPIKeyStatus(), done);
                })
                .catch(done);
            });

        });
      });
    });
  });
});
