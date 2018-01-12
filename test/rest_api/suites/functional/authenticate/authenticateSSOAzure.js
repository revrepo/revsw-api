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
var AzureDP = require('./../../../common/providers/data/azure');
var azureKey = config.get('api.azureKey');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Authenticate SSO Azure resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should generate a different token each time',
      function (done) {
        var tokens = [];
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
                var tokensWanted = 5;
                var ssoPolling = function (wanted) {
                  if (wanted === 0) {
                    // check if any tokens are the same
                    for (var i = 0; i < tokens.length; i++) {
                      for (var j = 0; j < tokens.length; j++) {
                        if (i !== j) {
                          tokens[i].should.not.equal(tokens[j]);
                        }
                      }
                    }
                    done();
                  } else {
                    // get 5 tokens
                    API.resources.azure
                      .subscriptions()
                      .resourceGroups(subscription)
                      .providers(resourceGroupName)
                      .accounts(provider)
                      .listSingleSignOnToken(resourceName)
                      .createOne()
                      .expect(200)
                      .then(function (res) {
                        tokens.push(res.body.token);
                        setTimeout(function () {
                          ssoPolling(wanted - 1);
                        }, 1500); // wait a sec
                      })
                      .catch(done);
                  }
                };
                ssoPolling(tokensWanted);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
