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

  users.forEach(function (user) {

    var testAccount;
    var testApp;

    describe('With user: ' + user.role, function () {

      describe('Apps resource', function () {
        describe('Success Response Data Schema', function () {

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
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps.deleteAllPrerequisites(done);
              })
              .catch(done);
          });

          beforeEach(function (done) {
            done();
          });

          afterEach(function (done) {
            done();
          });

          it('should return data applying apps schema when getting all apps.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var apps = response.body;
                  apps.forEach(function (app) {
                    Joi.validate(app, SchemaProvider.getApp(), function (err) {
                      if (err) {
                        return done(err);
                      }
                    });
                  });
                  done();
                })
                .catch(done);
            });

          it('should return data applying apps schema when getting specific ' +
            'app.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps
                    .getOne(testApp.id)
                    .expect(200);
                })
                .then(function (response) {
                  var app = response.body;
                  Joi.validate(app, SchemaProvider.getApp(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'creating specific app.',
            function (done) {
              var newApp = AppsDP.generateOne(testAccount.id);
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps
                    .createOne(newApp)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getCreateAppStatus(),
                    function (error) {
                      if (error) {
                        return done(error);
                      }
                      API.resources.apps
                        .deleteOne(data.object_id)
                        .end(done);
                    });
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'updating specific app.',
            function (done) {
              var newApp = AppsDP.generateOne(testAccount.id);
              var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps.createOneAsPrerequisite(newApp);
                })
                .then(function (response) {
                  return API.resources.apps
                    .update(response.body.id, updatedApp)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getSuccessResponse(), done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'deleting an app.',
            function (done) {
              var newApp = AppsDP.generateOne(testAccount.id);
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps.createOneAsPrerequisite(newApp);
                })
                .then(function (response) {
                  return API.resources.apps
                    .deleteOne(response.body.id)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getAppStatus(), done);
                })
                .catch(done);
            });

          it('should allow to get all SDK releases',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps
                    .sdkReleases()
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getAppSdkRelease(),
                    done);
                })
                .catch(done);
            });

          it('should allow to get config status for specific app',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps
                    .configStatus(testApp.id)
                    .getOne()
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, SchemaProvider.getAppConfigStatus(), done);
                })
                .catch(done);
            });

          it('should allow to get all versions for specific app',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps
                    .versions(testApp.id)
                    .getAll()
                    .expect(200);
                })
                .then(function (response) {
                  var apps = response.body;
                  apps.forEach(function (app) {
                    Joi.validate(app, SchemaProvider.getAppVersion(),
                      function (err) {
                        if (err) {
                          return done(err);
                        }
                      });
                  });
                  done();
                })
                .catch(done);
            });
        });
      });
    });
  });
});
