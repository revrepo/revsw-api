/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

  var RevAdmin = config.get('api.users.revAdmin');

  describe('Azure resource', function () {

    before(function (done) {
      done();
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

    it('should return a success response when getting all subscriptions with revAdmin role.', 
      function (done) {
        API.helpers
          .authenticateUser(RevAdmin)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting all resources with revAdmin role.', 
      function (done) {
        API.helpers
          .authenticateUser(RevAdmin)
          .then(function () {
            API.resources.azure
              .resources()
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting all resources in resourceGroup with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        API.helpers
          .authenticateAzureKey()
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting all resources in subscription with revAdmin role.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        API.helpers
          .authenticateUser(RevAdmin)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .providers(subscription)
              .accounts(provider)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
      
    it('should return a success response when getting specific resource with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        API.helpers
          .authenticateAzureKey()
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .getOne(resourceName)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting all resources in subscription with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        API.helpers
          .authenticateAzureKey()
          .then(function () {
            API.resources.azure
              .subscriptions()
              .providers(subscription)
              .accounts(provider)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});

