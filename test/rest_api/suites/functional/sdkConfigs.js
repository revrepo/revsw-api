/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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
var DataProvider = require('./../../common/providers/data');
var AppsDP = require('./../../common/providers/data/apps');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);
  
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {
    var secondTestApp;
    var testApp;
    var testAccount;
    var secondTestAccount;

    describe('With user: ' + user.role, function() {

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
              return API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.helpers.accounts.createOne();
                })
                .then(function (newAccount) {
                  secondTestAccount = newAccount;
                  return API.helpers.apps.create({accountId: secondTestAccount.id});
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

      describe('SDK Configs resource', function () {

        it('should allow to `get` specific `SDK config` without authentication.',
          function (done) {
            var sdk_key = DataProvider.generateSDKConfig().sdk_key;
            API.resources.sdkConfigs
              .getOne(sdk_key)
              .expect(200)
              .end(done);
          });

        it('should return a success response when getting specific app SDK Config with user-role user.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOne(newApp);
              })
              .then(function (response) {
                var sdk_key = response.body.sdk_key;
                API.resources.sdkConfigs
                  .getOne(sdk_key)
                  .expect(200)
                  .then(function (res) {
                    var data = res.body;
                    newApp.app_name.should.equal(data.app_name);
                    newApp.app_platform.should.equal(data.os);
                    newApp.account_id.should.equal(testAccount.id);
                    config.should.not.be.undefined();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should return `Bad Request` when trying to `get` non-existing `SDK config`.',
          function (done) {
            var sdk_key = DataProvider.generateInvalidSDKConfig().sdk_key;
            API.resources.sdkConfigs
              .getOne(sdk_key)
              .expect(400)
              .end(function (err, res) {
                res.body.error.should.equal('Bad Request');
                res.body.message.should.equal('Application not found');
                done();
              });
          });
      });
    });
  });
});
