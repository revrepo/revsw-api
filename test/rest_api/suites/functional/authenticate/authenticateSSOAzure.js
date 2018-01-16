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
var should = require('should');
var request = require('supertest-as-promised');

var config = require('config');
var API = require('./../../../common/api');
var AzureDP = require('./../../../common/providers/data/azure');
var azureKey = config.get('api.azureKey');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');

  var provider = AzureDP.generateOne().provider;
  var subscription = AzureDP.generateOne().subscription_id;
  var resourceGroupName = AzureDP.generateOne().resource_group_name;
  var resourceName = AzureDP.generateOne().resource_name;
  var location = AzureDP.generateLocation();
  var testAPIUrl = API.helpers.getAPIURL();

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

    it('should return a token when authenticating Azure SSO Token',
      function (done) {
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
                      .createOne({ token: res.body.token, resourceId: res.body.resourceId })
                      .expect(200)
                      .then(function (res) {
                        should(res.body.token).not.equal(undefined);
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


    it('should generate a different token each time',
      function (done) {
        var tokens = [];
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


    describe('API Requests using SSO authentication token', function () {

      var authToken = {};

      before(function (done) {
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
              .then(function (res) {
                authToken.resourceId = res.body.resourceId;
                authToken.token = res.body.token;
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

      it('should successfully send a request to the API using the authentication token',
        function (done) {
          API.helpers.authenticate(authToken)
            .then(function () {
              API.resources.users
                .myself()
                .getOne()
                .expect(200)
                .then(function (res) {
                  res.body.lastname.should.containEql(resourceName);
                  done();
                })
                .catch(done);
            });
        });
    });
  });
});
