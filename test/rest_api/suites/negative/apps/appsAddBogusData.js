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
var appsSchema = require('./../../../common/providers/schema/json/appsAdd.json');
var API = require('./../../../common/api');
var AppsDP = require('./../../../common/providers/data/apps');
var AppsDDHelper = AppsDP.DataDrivenHelper;

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');

  describe('Apps resource', function () {
    describe('Add with `bogus` data', function () {

      var testAccount;
      var testApp;
      var fullTestApp = API.providers.data.apps.generate({});

      before(function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            testAccount = newAccount;
            fullTestApp.account_id = newAccount.id;
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

      var getBogusDataCheckCallBack = function () {
        return function (done) {
          var clonedApp = AppsDP.clone(fullTestApp);
          AppsDDHelper
            .setValueByPath(clonedApp, ddCase.propertyPath, ddCase.testValue);
          API.helpers
            .authenticateUser(user)
            .then(function () {
              API.resources.apps
                .createOne(clonedApp)
                .expect(400)
                .then(function (res) {
                  ddCase.propertyPath.split('.').forEach(function (key) {
                    if (key === '0') {
                      res.body.message.should.containEql('position 0');
                    }
                    else {
                      res.body.message.should.containEql('"' + key + '" fails');
                    }
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      for (var key in appsSchema) {
        if (!appsSchema.hasOwnProperty(key)) {
          continue;
        }
        var ddCase = AppsDDHelper
          .generateBogusData('add', key, appsSchema[key]);
        var propertyValue = AppsDDHelper.getValueByPath(fullTestApp, key);
        if (ddCase.testValue === undefined || propertyValue === undefined) {
          continue;
        }
        if (ddCase.skipReason) {
          // Setting test as pending as there is a reason (usually a BUG)
          xit(ddCase.spec, getBogusDataCheckCallBack(ddCase));
        }
        else {
          // Running the test for specific DataDriven case
          it(ddCase.spec, getBogusDataCheckCallBack(ddCase));
        }
      }
    });
  });
});
