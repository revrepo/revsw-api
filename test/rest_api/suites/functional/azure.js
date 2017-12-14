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

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var RevAdmin = config.get('api.users.revAdmin');


  // TODO: Need to fix Azure API authentication and enable the tests back
  xdescribe('Azure resource', function () {

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

    it('should create subscription with Azure token and get Subscriptions list with revAdmin role.',
      function (done) {
        var subscription = AzureDP.generateTwo().subscription_id;
        var state = AzureDP.generate();
        API.helpers
          .authenticateAzureKey()
          .then(function () {
            API.resources.azure
              .subscriptions()
              .update(subscription, state)
              .expect(200)
              .then(function (){
                API.identity
                  .authenticate(RevAdmin)
                  .then(function () {
                    API.resources.azure
                      .subscriptions()
                      .getAll()
                      .expect(200)
                      .then(function (res) {
                        var subscriptions = res.body;
                        subscriptions[2].subscription_id.should.equal(subscription);
                        subscriptions.forEach(function (subscription) {
                          subscription.id.should.not.be.undefined();
                        });
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should create resource with Azure token and get Resources list with revAdmin role.',
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        var resourceGroupName = AzureDP.generateOne().resource_group_name;
        var resourceName = AzureDP.generateOne().resource_name;
        var location = AzureDP.generateLocation();
        API.helpers
          .authenticateAzureKey()
          .then(function () {
            API.resources.azure
              .subscriptions()
              .resourceGroups(subscription)
              .providers(resourceGroupName)
              .accounts(provider)
              .update(resourceName, location)
              .expect(200)
              .then(function () {
                API.identity
                  .authenticate(RevAdmin)
                  .then(function () {
                    API.resources.azure
                      .resources()
                      .getAll()
                      .expect(200)
                      .then(function (res) {
                        var resources = res.body;
                        resources[26].resource_name.should.equal(resourceName);
                        resources.forEach(function (resource) {
                          resource.resource_name.should.not.be.undefined();
                        });
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should get Resources list in resourceGroup with Azure token.',
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
              .then(function (res) {
                var providers = res.body.value;
                providers.should.not.be.undefined();
                providers.length.should.greaterThanOrEqual(0);
                providers.forEach(function (plan) {
                  plan.id.should.not.be.undefined();
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should get Resources list in subscription with revAdmin role.',
      function (done) {
        var provider = AzureDP.generateOne().provider;
        var subscription = AzureDP.generateOne().subscription_id;
        API.identity
          .authenticate(RevAdmin)
          .then(function () {
            API.resources.azure
              .subscriptions()
              .providers(subscription)
              .accounts(provider)
              .getAll()
              .expect(200)
              .then(function (res) {
                var providers = res.body.value;
                providers.should.not.be.undefined();
                providers.length.should.greaterThanOrEqual(0);
                providers.forEach(function (plan) {
                  plan.name.should.not.be.undefined();
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should get specific Resource with Azure token.',
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
              .then(function (response) {
                var resource = response.body;
                resource.should.not.be.undefined();
                resource.name.should.be.equal(resourceName);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should get Resources list in subscription with Azure token.',
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
              .then(function (res) {
                var providers = res.body.value;
                providers.should.not.be.undefined();
                providers.length.should.greaterThanOrEqual(0);
                providers.forEach(function (plan) {
                  plan.name.should.not.be.undefined();
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
