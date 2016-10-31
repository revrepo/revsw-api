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

var config = require('config');
var API = require('./../../../common/api');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];
  var expectedDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

  users.forEach(function (user) {

    var testAccount;
    var testApp;

    describe('With user: ' + user.role, function () {

      describe('Apps resource', function () {
        describe('Date Format', function () {

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

          it('should return `updated_at` field in expected `Date format` ' +
            'when getting all apps.',
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
                    app.updated_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            });

          it('should return `created_at` and `updated_at` field in expected ' +
            '`Date format` when getting specific app.',
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
                  app.created_at.should.match(expectedDateFormat);
                  app.updated_at.should.match(expectedDateFormat);
                  done();
                })
                .catch(done);
            });

          it('should return `updated_at` field in expected `Date format` ' +
            'when getting all versions for specific app',
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
                    app.updated_at.should.match(expectedDateFormat);
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
