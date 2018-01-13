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

describe('Negative check', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    var user = config.get('api.users.reseller');

    var provider = AzureDP.generateOne().provider;
    var subscription = AzureDP.generateOne().subscription_id;
    var resourceGroupName = AzureDP.generateOne().resource_group_name;
    var resourceName = AzureDP.generateOne().resource_name;
    var location = AzureDP.generateLocation();
    var testAPIUrl = API.helpers.getAPIURL();
    var authToken = {};

    describe('Authenticate SSO Azure resource with No Data', function () {

        before(function (done) {
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
                                    authToken.token = res.body.token;
                                    authToken.resourceId = res.body.resourceId;
                                    done();
                                })
                                .catch(done);
                        })
                        .catch(done);
                })
                .catch(done);
        });

        afterEach(function (done) {
            done();
        });

        it('should return a token when authenticating Azure SSO Token',
            function (done) {
                API.resources.authenticateSSOAzure
                    .createOne(authToken)
                    .expect(200)
                    .then(function (res) {
                        should(res.body.token).not.equal(undefined);
                        done();
                    })
                    .catch(done);
            });

        it('should return a `400 Bad Request` response when authenticating without `resourceId`',
            function (done) {
                API.resources.authenticateSSOAzure
                    .createOne({ token: authToken.token })
                    .expect(400)
                    .end(done);
            });

        it('should return a `400 Bad Request` response when authenticating without `token`',
            function (done) {
                API.resources.authenticateSSOAzure
                    .createOne({ resourceId: authToken.resourceId })
                    .expect(400)
                    .end(done);
            });

        it('should return a `400 Bad Request` response when authenticating without any data',
            function (done) {
                API.resources.authenticateSSOAzure
                    .createOne()
                    .expect(400)
                    .end(done);
            });
    });
});
