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
    var testApp;

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
                return API.helpers.apps.create({accountId: testAccount.id});
              })
              .then(function (app) {
                testApp = app;
              })
              .then(done)
              .catch(done);
          });

          after(function (done) {
            done();
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying `error response` schema when ' +
            'getting all apps.',
            function (done) {
              API.session.reset();
              API.resources.apps
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting specific app.',
            function (done) {
              API.session.reset();
              API.resources.apps
                .getOne(testApp.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'creating specific app.',
            function (done) {
              var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
              API.session.reset();
              API.resources.apps
                .createOne(newApp)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'updating specific app.',
            function (done) {
              var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
              API.session.reset();
              API.resources.apps
                .update(testAccount.id, updatedApp)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'deleting an app.',
            function (done) {
              var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
              API.session.reset();
              API.resources.apps
                .deleteOne(testApp.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting all SDK releases',
            function (done) {
              API.session.reset();
              API.resources.apps
                .sdkReleases()
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting config status for specific app',
            function (done) {
              API.session.reset();
              API.resources.apps
                .configStatus(testApp.id)
                .getOne()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting all versions for specific app',
            function (done) {
              API.session.reset();
              API.resources.apps
                .versions(testApp.id)
                .getAll()
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
