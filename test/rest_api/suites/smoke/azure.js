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
  var azureKey = config.get('api.azureKey');

  // TODO: Need to fix Azure API key authentication and after that check/rewrite the tests

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
          .authenticateAzureKey(azureKey)
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
        var resourceName = AzureDP.generateResource().resource_name;
        API.helpers
          .authenticateAzureKey(azureKey)
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
          .authenticateAzureKey(azureKey)
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

    var subscription = 'SUB' + Date.now();
    it('should return a success response when create a subscription (Unregistered state) with Azure token.',
      function (done) {
        var state = { state: 'Unregistered' };
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .update(subscription, state)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

      it('should return a success response when create a subscription (Registered state) with Azure token.',
      function (done) {
        var state = { state: 'Registered' };
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .update(subscription, state)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when create a subscription (that already exists but different state) with Azure token.',
      function (done) {
        var state = { state: 'Suspended' };
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .update(subscription, state)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

      it('should return a success response when create a subscription (that already exists with same state) with Azure token.',
      function (done) {
        var state = { state: 'Suspended' };
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .update(subscription, state)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when create a resource with Azure token.', 
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
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when update a resource with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .patch(resourceName)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });      

    it('should return a success response when move a resource with Azure token.', 
      function (done) {
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .moveResources(resourceGroupName)
              .createOne()
              .expect(400)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when create a list secrets with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .listSecrets(resourceName)
              .createOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting all operations  with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .providers()
              .operations(provider)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when update Communication Preference with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .providers(subscription)
              .updateCommunicationPreference(provider) 
              .createOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response get list Communication Preference with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .providers(subscription)
              .listCommunicationPreference(provider) 
              .createOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when regenerate key with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .regenerateKey(resourceName)
              .createOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when get list Single Sign On Authorization with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .listSingleSignOnToken(resourceName)
              .createOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when delete a resource with Azure token.', 
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        API.helpers
          .authenticateAzureKey(azureKey)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider) 
              .deleteOne(resourceName)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});

