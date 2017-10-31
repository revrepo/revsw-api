/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

var config = require('config');
var swagger = require('../../page_objects/swagger');
var constants = require('../../page_objects/constants');

describe('Functional', function () {
    describe('Swagger UI using API key', function () {

        var apiKey = config.get('swagger.validApiKey');
        var invalidApiKey = config.get('swagger.invalidApiKey');

        beforeEach(function () {
            swagger.load();
            // disable animations
            browser.executeScript('jQuery.fx.off=true;');
            browser.ignoreSynchronization = true;
        });
        var loops = 0;
        function waitForElement() {

            if (loops === 10) { clearInterval(handler) }
        }

        it('should return 401 status code if `Try it out!`' +
            ' button is clicked without authentication', function (done) {
                swagger.api.endpoints.getEndpoint(0).then(function (endpoint) {
                    endpoint.clickTitle();
                    endpoint.clickSubmit();
                    swagger.waitForElement(swagger
                        .locators
                        .api
                        .resource
                        .endPoints
                        .endPoint
                        .response
                        .responseCode
                        .css, function () {
                            expect(endpoint.getResponseCode()).toBe('401');
                            done();
                        });
                });
            });

        it('should successfully authenticate using a valid API key', function (done) {
            swagger.header.setAPIKey(apiKey).then(function () {
                swagger.header.clickAuthBtn();
                swagger.waitForText(swagger
                    .locators
                    .authMsgs
                    .success, function () {
                        swagger.getSuccessAuthMSG().getText().then(function (text) {
                            expect(text).toBe(constants.SUCCESSFUL_AUTH_MSG);
                        });
                        done();
                    });

            });
        });

        it('should return 200 status code if `Try it out!`' +
            ' button is clicked after authentication', function (done) {
                swagger.header.setAPIKey(apiKey).then(function () {
                    swagger.header.clickAuthBtn();
                    swagger.waitForText(swagger
                        .locators
                        .authMsgs
                        .success, function () {
                            swagger.api.endpoints.getEndpoint(0).then(function (endpoint) {
                                endpoint.clickTitle();
                                endpoint.clickSubmit();
                                swagger.waitForElement(swagger
                                    .locators
                                    .api
                                    .resource
                                    .endPoints
                                    .endPoint
                                    .response
                                    .responseCode
                                    .css, function () {
                                        expect(endpoint.getResponseCode()).toBe('200');
                                        done();
                                    });
                            });
                        });
                });
            });

        it('should successfully logout', function (done) {
            swagger.header.setAPIKey(apiKey).then(function () {
                swagger.header.clickAuthBtn();
                swagger.waitForText(swagger
                    .locators
                    .authMsgs
                    .success, function () {
                        swagger.header.clickLogoutBtn();
                        expect(swagger.header.getLogoutBtn().isEnabled()).toBeFalsy();
                        done();
                    });
            });
        });

        it('should return 401 status code if `Try it out!`' +
            ' button is clicked after logout', function (done) {
                swagger.api.endpoints.getEndpoint(0).then(function (endpoint) {
                    endpoint.clickTitle();
                    endpoint.clickSubmit();
                    swagger.waitForElement(swagger
                        .locators
                        .api
                        .resource
                        .endPoints
                        .endPoint
                        .response
                        .responseCode
                        .css, function () {
                            expect(endpoint.getResponseCode()).toBe('401');
                            done();
                        });
                });
            });

        it('should fail to authenticate if invalid API key is used', function () {
            swagger.header.setAPIKey(invalidApiKey).then(function (done) {
                swagger.header.clickAuthBtn();
                swagger.waitForText(swagger
                    .locators
                    .authMsgs
                    .fail, function () {
                        swagger.getFailAuthMSG().getText().then(function (text) {
                            expect(text).toBe(constants.FAIL_AUTH_MSG);
                        });
                        done();
                    });

            });
        });

    });
});
