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
    describe('Swagger UI using user', function () {

        var user = config.get('swagger.users.revAdmin');

        beforeEach(function () {
            swagger.load();
            browser.sleep(5000);
        });

        it('should return 401 status code if `Try it out!`' +
            'button is clicked without authentication', function () {
                swagger.api.endpoints.getEndpoint(0).then(function (endpoint) {
                    endpoint.clickTitle();
                    browser.sleep(2000);
                    endpoint.clickSubmit();
                    browser.sleep(2000);
                    endpoint.getResponseCode().then(function (code) {
                        expect(code).toBe('401');
                        endpoint.clickTitle();
                    });
                });
            });

        it('should successfully authenticate using a valid user', function () {
            swagger.header.setAuthVia('Username/Password');
            swagger.header.clickAuthBtn();
            browser.sleep(1000);
            swagger.header.setUsername(user.email);
            swagger.header.setPassword(user.password);
            swagger.header.clickAuthBtn();
            browser.sleep(1000);
            swagger.getSuccessAuthMSG().getText().then(function (text) {
                expect(text).toBe(constants.SUCCESSFUL_AUTH_MSG);
            });
        });

        it('should return 200 status code if `Try it out!`' +
            ' button is clicked after authentication', function () {
                swagger.header.setAuthVia('Username/Password');
                swagger.header.clickAuthBtn();
                browser.sleep(1000);
                swagger.header.setUsername(user.email);
                swagger.header.setPassword(user.password);
                swagger.header.clickAuthBtn();
                browser.sleep(1000);
                swagger.api.endpoints.getEndpoint(0).then(function (endpoint) {
                    endpoint.clickTitle();
                    browser.sleep(2000);
                    endpoint.clickSubmit();
                    browser.sleep(2000);
                    endpoint.getResponseCode().then(function (code) {
                        expect(code).toBe('200');
                        endpoint.clickTitle();
                    });
                });
            });

        it('should successfully logout', function () {
            swagger.header.setAuthVia('Username/Password');
            swagger.header.clickAuthBtn();
            browser.sleep(1000);
            swagger.header.setUsername(user.email);
            swagger.header.setPassword(user.password);
            swagger.header.clickAuthBtn();
            browser.sleep(1000);
            swagger.header.clickLogoutBtn();
            expect(swagger.header.getLogoutBtn().isEnabled()).toBeFalsy();
        });

        it('should return 401 status code if `Try it out!`' +
            ' button is clicked after logout', function () {
                swagger.api.endpoints.getEndpoint(0).then(function (endpoint) {
                    endpoint.clickTitle();
                    browser.sleep(2000);
                    endpoint.clickSubmit();
                    browser.sleep(2000);
                    endpoint.getResponseCode().then(function (code) {
                        expect(code).toBe('401');
                        endpoint.clickTitle();
                    });
                });
            });
    });
});
