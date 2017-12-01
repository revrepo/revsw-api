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

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user')
  ];

  users.forEach(function (user) {

    describe('Azure resource', function () {

      describe('With not-allowed user: ' + user.role, function () {

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

        it('should return `Forbidden` response when getting all subscriptions with user-role user.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions() 
                  .getAll()
                  .expect(403)
                  .end(done);
              })
              .catch(done);
          });
      
        it('should return `Forbidden` response when getting all resources with user-role user.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .resources()
                  .getAll()
                  .expect(403)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when getting all resources in resourceGroup with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider) 
                  .getAll()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Forbidden` response when getting all resources in subscription with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .providers(subscription)
                  .accounts(provider) 
                  .getAll()
                  .expect(403)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when getting specific resource with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            var resourceName = AzureDP.generateOne().resource_name;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider) 
                  .getOne(resourceName)
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when create a subscription with user-role user.', 
          function (done) {
            var subscription = AzureDP.generateTwo().subscription_id;
            var state = AzureDP.generate();
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .update(subscription, state)
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when create a resource with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            var resourceName = AzureDP.generateOne().resource_name;
            var location = AzureDP.generateLocation();
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider) 
                  .update(resourceName, location)
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when move a resource with user-role user.', 
          function (done) {
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .moveResources(resourceGroupName)
                  .createOne()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when create a list secrets with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            var resourceName = AzureDP.generateOne().resource_name;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider) 
                  .listSecrets(resourceName)
                  .createOne()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when getting all operations with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .providers()
                  .operations(provider)
                  .getAll()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when update Communication Preference with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .providers(subscription)
                  .updateCommunicationPreference(provider) 
                  .createOne()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response get list Communication Preference with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .providers(subscription)
                  .listCommunicationPreference(provider) 
                  .createOne()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when regenerate key with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            var resourceName = AzureDP.generateOne().resource_name;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider) 
                  .regenerateKey(resourceName)
                  .createOne()
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });

        it('should return `Unauthorized` response when delete a resource with user-role user.', 
          function (done) {
            var provider = AzureDP.generateOne().provider;
            var subscription = AzureDP.generateOne().subscription_id;
            var resourceGroupName = AzureDP.generateOne().resource_group_name;
            var resourceName = AzureDP.generateOne().resource_name;
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups(subscription)
                  .providers(resourceGroupName)
                  .accounts(provider) 
                  .deleteOne(resourceName)
                  .expect(401)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});
