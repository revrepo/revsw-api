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
var API = require('./../../../common/api');
var AzureDP = require('./../../../common/providers/data/azure');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var RevAdmin = config.get('api.users.revAdmin');
  var azureKey = config.get('api.azureKey');
  var azureResource;
  var authToken = {};
  var resourceDomain;
  var resourceAcc;
  var resourceApp;
  var resourceDNSZone;

  describe('Azure resource auto removal of child objects (domains, apps, DNS zones)', function () {

    before(function (done) {
      // create an azure resource
      API.helpers.authenticateAzureKey(azureKey).then(function () {
        API.helpers.azure.createOne()
          .then(function (res) {
            return res.original_object;
          })
          .then(function (resource) {
            azureResource = resource;
            // authenticate with resource
            return API.resources.azure
              .subscriptions()
              .resourceGroups(azureResource.subscription_id)
              .providers(azureResource.resource_group_name)
              .accounts(azureResource.provider)
              .listSingleSignOnToken(azureResource.resource_name)
              .createOne()
              .expect(200);
          })
          .then(function (token) {
            authToken.resourceId = token.body.resourceId;
            authToken.token = token.body.token;
            return API.helpers.authenticate(authToken);
          })
          .then(function () {
            // get account associated to our resource
            return API.resources.accounts
              .getAll()
              .expect(200)
          })
          .then(function (acc) {
            resourceAcc = acc.body[0];
            // create a domain for that account
            return API.helpers.domainConfigs.createOne(resourceAcc.id, 'AzureTest')
          })
          .then(function (domain) {
            resourceDomain = domain;
            // create an app for that account
            return API.helpers.apps.create({ accountId: resourceAcc.id });
          })
          .then(function (app) {
            resourceApp = app;
            // create a DNS zone for that account
            return API.helpers.dnsZones.create(resourceAcc.id);
          })
          .then(function (dnsZone) {
            resourceDNSZone = dnsZone;
            // okay everything is created, now lets delete the resource and test!
            API.helpers.authenticateAzureKey(azureKey).then(function () {
              API.resources.azure
                .subscriptions()
                .resourceGroups(azureResource.subscription_id)
                .providers(azureResource.resource_group_name)
                .accounts(azureResource.provider)
                .deleteOne(azureResource.resource_name)
                .expect(200)
                .end(done);
            });
          })
          .catch(done);
      });

    });

    it('should return `400 Domain ID Not Found` when getting domain of resource', function (done) {
      API.helpers.authenticate(RevAdmin)
        .then(function () {
          API.resources.domainConfigs
            .getOne(resourceDomain.id)
            .expect(400)
            .end(done);
        })
        .catch(done);
    });

    it('should return `400 App ID Not Found` when getting app of resource', function (done) {
      API.helpers.authenticate(RevAdmin)
        .then(function () {
          API.resources.apps
            .getOne(resourceApp.id)
            .expect(400)
            .end(done);
        })
        .catch(done);
    });

    it('should return `400 DNS Zone ID Not Found` when getting DNS zone of resource', function (done) {
      API.helpers.authenticate(RevAdmin)
        .then(function () {
          API.resources.dnsZones
            .getOne(resourceDNSZone.id)
            .expect(400)
            .end(done);
        })
        .catch(done);
    });
  });
});
