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
var AppsDP = require('./../../../common/providers/data/apps');
var APIKeysDP = require('./../../../common/providers/data/apiKeys');

var SchemaProvider = require('./../../../common/providers/schema');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];
  var errorResponseSchema = SchemaProvider.getErrorResponse();

  users.forEach(function (user) {

    var testAccount;
    var testAPIKey;

    describe('With user: ' + user.role, function () {

      describe('Apps resource', function () {
        describe('Error Response Data Schema', function () {

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
                API.resources.apiKeys.deleteOne(testAPIKey.id).end(done);
                //API.resources.apiKeys.deleteAllPrerequisites(done);// TODO-NOTE: this method not work
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying `error response` schema when ' +
            'getting all API Keys.',
            function (done) {
              API.session.reset();
              API.resources.apiKeys
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting specific API Key.',
            function (done) {
              API.session.reset();
              API.resources.apiKeys
                .getOne(testAPIKey.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'creating specific API Key.',
            function (done) {
              var newAPIKey = APIKeysDP.generateOne(testAccount.id);
              API.session.reset();
              API.resources.apiKeys
                .createOne(newAPIKey)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'updating specific API Key.',
            function (done) {
              var updatedAPIKey = APIKeysDP
                .generateCompleteOne(testAccount.id, 'UPDATED');
              API.session.reset();
              API.resources.apiKeys
                .update(testAccount.id, updatedAPIKey)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'deleting an API Key.',
            function (done) {
              API.session.reset();
              API.resources.apiKeys
                .deleteOne(testAPIKey.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });
        });
      });
    });
  });
});
