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
var AppsDP = require('./../../../common/providers/data/apps');

describe('Negative check', function () {

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

        describe('Bogus Data', function () {

          var bogusId = '!@#$%^&*()_+';

          before(function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.helpers.accounts.createOne();
              })
              .then(function (newAccount) {
                testAccount = newAccount;
                return API.helpers.apps.createOne(testAccount.id);
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

          it('should return `bad request` response when getting app using ' +
            'bogus id.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  API.resources.apps
                    .getOne(bogusId)
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"app_id" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

          it('should return `bad request` response when deleting app using ' +
            'bogus id.',
            function (done) {
              var newApp = AppsDP.generateOne(testAccount.id, 'NEW');
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.apps.createOneAsPrerequisite(newApp);
                })
                .then(function () {
                  API.resources.apps
                    .deleteOne(bogusId)
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"app_id" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

          it('should return `bad request` response when getting config ' +
            'status for app using bogus id',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  API.resources.apps
                    .configStatus(bogusId)
                    .getOne()
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"app_id" fails');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

          it('should return `bad request` response when getting versions ' +
            'for app using bogus id',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  API.resources.apps
                    .versions(bogusId)
                    .getAll()
                    .expect(400)
                    .then(function (response) {
                      response.body.message.should.containEql('"app_id" fails');
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
});
