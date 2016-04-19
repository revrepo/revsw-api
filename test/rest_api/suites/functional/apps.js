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

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var reseller = config.get('api.users.reseller');
  var secondReseller = config.get('api.users.secondReseller');
  var users = [
    //config.get('api.users.revAdmin'),
    reseller
  ];

  users.forEach(function (user) {

    var secondTestAccount;
    var secondTestApp;
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
              return API.helpers.apps.createOne(secondTestAccount.id);
            })
            .then(function (app) {
              testApp = app;
              return API.helpers
                .authenticateUser(secondReseller)
                .then(function () {
                  return API.helpers.accounts.createOne();
                })
                .then(function (newAccount) {
                  secondTestAccount = newAccount;
                  return API.helpers.apps.createOne(secondTestAccount.id);
                })
                .then(function (app) {
                  secondTestApp = app;
                })
                .then(done)
                .catch(done);
            })
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

        it('should not allow to get apps from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var apps = response.body;
                    apps.forEach(function (app) {
                      app.id.should.not.equal(secondTestApp.id);
                    });
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to get specific app from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .getOne(secondTestApp.id)
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('App ID not found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to update an app from other user.',
          function (done) {
            var newApp = AppsDP.generateOne(secondTestAccount.id, 'NEW');
            var updatedApp = AppsDP
              .generateOneForUpdate(secondTestAccount.id, 'UPDATED');
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp)
                  .expect(404)
                  .then(function (response) {
                    response.body.error.should.equal('Not Found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to delete an app from other user.',
          function (done) {
            var newApp = AppsDP.generateOne(secondTestAccount.id, 'NEW');
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .deleteOne(response.body.id)
                  .expect(404)
                  .then(function (response) {
                    response.body.error.should.equal('Not Found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to get config status for specific app from ' +
          'other user',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .configStatus(secondTestApp.id)
                  .getOne()
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('App ID not found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to get all versions for specific app form ' +
          'other user',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .versions(secondTestApp.id)
                  .getAll()
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('App ID not found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to verify an app config.',
          function (done) {
            var options = {options: 'verify_only'};
            var newApp = AppsDP.generateOne(testAccount.id, 'NEW');
            var updatedApp = AppsDP
              .generateOneForUpdate(testAccount.id, 'UPDATED');
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp, options)
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

        it('should allow to publish an app config.',
          function (done) {
            var options = {options: 'publish'};
            var newApp = AppsDP.generateOne(testAccount.id, 'NEW');
            var updatedApp = AppsDP
              .generateOneForUpdate(testAccount.id, 'UPDATED');
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp, options)
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
      });
    });
  });
});
