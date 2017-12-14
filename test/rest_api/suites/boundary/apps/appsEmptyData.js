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

describe('Boundary check', function () {

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
        describe('Empty Data', function () {

          var emptyString = '';

          before(function (done) {
            API.identity
              .authenticate(user)
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

          it('should return `not found` response when deleting an app with ' +
            '`empty` app id.',
            function (done) {
              var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
              API.identity
                .authenticate(user)
                .then(function () {
                  return API.resources.apps.createOne(newApp);
                })
                .then(function () {
                  API.resources.apps
                    .deleteOne(emptyString)
                    .expect(404)
                    .then(function (response) {
                      response.body.error.should.containEql('Not Found');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });

          it('should return `bad request` response when getting config ' +
            'status for specific app with `empty` app id',
            function (done) {
              API.identity
                .authenticate(user)
                .then(function () {
                  API.resources.apps
                    .configStatus(emptyString)
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

          it('should return `bad request` response when getting all versions ' +
            'for specific app with `empty` app id',
            function (done) {
              API.identity
                .authenticate(user)
                .then(function () {
                  API.resources.apps
                    .versions(emptyString)
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
