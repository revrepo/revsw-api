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
var AzureDP = require('./../../common/providers/data/azure');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');
  var azureKey = config.get('api.azureKey');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Authenticate resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return success response when authenticating user',
      function (done) {
        API.resources.authenticate
          .createOne({ email: user.email, password: user.password })
          .expect(200)
          .end(done);
      });

    it('should return a success response when authenticating Azure SSO Token',
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        var location = AzureDP.generateLocation();
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider)
              .update(resourceName, location)
              .expect(200)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider)
                  .listSingleSignOnToken(resourceName)
                  .createOne()
                  .expect(200)
                  .then(function (res) {
                    API.resources.authenticateSSOAzure
                      .createOne({token: res.body.token, resourceId: res.body.resourceId})
                      .expect(200)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
