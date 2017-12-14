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

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user')
  ];

  users.forEach(function (user) {

    var testAccount;
    var testApp;

    describe('With user: ' + user.role, function () {

      describe('Apps resource', function () {

        before(function (done) {
          API.identity
            .authenticate(user)
            .then(function () {
              if (user === config.get('api.users.admin') ||
                user === config.get('api.users.user')) {
                return API.resources.users
                  .myself()
                  .getOne()
                  .expect(200)
                  .then(function (res) {
                    return {
                      'id': res.body.companyId[0]
                    };
                  })
                  .catch(done);
              }
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

        it('should allow to get all apps.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.apps
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var apps = response.body;
                    apps.should.not.be.empty();
                    apps.length.should.greaterThan(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get specific app.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.apps
                  .getOne(testApp.id)
                  .expect(200)
                  .then(function (response) {
                    var app = response.body;
                    app.id.should.equal(testApp.id);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to create an app.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.apps
                  .createOne(newApp)
                  .expect(200)
                  .then(function (response) {
                    var newApp = response.body;
                    newApp.statusCode.should.equal(200);
                    newApp.id.should.not.be.empty();
                    newApp.sdk_key.should.not.be.empty();
                    // Delete app
                    API.resources.apps
                      .deleteOne(newApp.object_id)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to update an app.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.apps.createOne(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp)
                  .expect(200)
                  .then(function (response) {
                    var updatedApp = response.body;
                    updatedApp.statusCode.should.equal(200);
                    updatedApp.message.should.equal('The application record ' +
                      'has been successfully updated');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to delete an app.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.apps.createOne(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .deleteOne(response.body.id)
                  .expect(200)
                  .then(function (response) {
                    var deletedApp = response.body;
                    deletedApp.statusCode.should.equal(200);
                    deletedApp.message.should.equal('The application has been ' +
                      'successfully deleted');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get all SDK releases',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.apps
                  .sdkReleases()
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var sdkReleases = response.body;
                    sdkReleases.iOS.should.not.be.undefined();
                    sdkReleases.Android.should.not.be.undefined();
                    sdkReleases.Windows_Mobile.should.not.be.undefined();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get config status for specific app',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.apps
                  .configStatus(testApp.id)
                  .getOne()
                  .expect(200)
                  .then(function (response) {
                    var configStatus = response.body;
                    configStatus.staging_status.should.not.be.undefined();
                    configStatus.global_status.should.not.be.undefined();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get all versions for specific app',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.apps
                  .versions(testApp.id)
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var versions = response.body;
                    versions.length.should.be.greaterThan(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
