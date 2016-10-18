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
var API = require('./../../common/api');
var AppsDP = require('./../../common/providers/data/apps');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    //config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    var testAccount;
    var testApp;

    describe('With user: ' + user.role, function () {

      describe('Apps resource', function () {

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

        it('should return a response when getting all apps.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting specific app.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .getOne(testApp.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when creating an app.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .createOne(newApp)
                  .expect(200)
                  .then(function (response) {
                    // Delete app
                    API.resources.apps
                      .deleteOne(response.body.object_id)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should return a response when updating an app.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when deleting an app.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .deleteOne(response.body.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting all SDK releases',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .sdkReleases()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting config status for an ' +
          'specific app',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .configStatus(testApp.id)
                  .getOne()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting all versions for ' +
          'specific app',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .versions(testApp.id)
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});
