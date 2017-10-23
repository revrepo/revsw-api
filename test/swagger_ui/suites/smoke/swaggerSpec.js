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

describe('Smoke', function () {
    describe('Swagger UI', function () {

        beforeAll(function () {
            swagger.load();
        });

        it('should display `Swagger UI` page', function () {
            expect(swagger.isDisplayed()).toBeTruthy();
        });

        it('should display `Authenticate Via` dropdown', function () {
            expect(swagger.header.getAuthViaDropdown().isDisplayed()).toBeTruthy();
        });

        it('should display `API Key` input field', function () {
            expect(swagger.header.getAPIKeyInput().isDisplayed()).toBeTruthy();
        });

        it('should display `Authenticate` button', function () {
            expect(swagger.header.getAuthBtn().isDisplayed()).toBeTruthy();
        });

        it('should display `Logout` button', function () {
            expect(swagger.header.getLogoutBtn().isDisplayed()).toBeTruthy();
        });

        it('should display `API` container', function () {
            expect(swagger.api.isDisplayed()).toBeTruthy();
        });

        it('should display API resources', function () {
            swagger.api.getResourcesCount().then(function (count) {
                expect(count).toBeGreaterThan(0);
            });
        });

        it('should display collapse/expand link for a resource', function () {
            swagger.api.getResourceLink().then(function (e) {
                expect(e.isDisplayed()).toBeTruthy();
            });
        });

        it('should collapse endpoints if link is clicked', function () {
            swagger.api.getResourceLink().then(function (e) {
                e.click();
                swagger.api.getResourceContent().then(function (endp) {
                    browser.sleep(2000); // wait for animation to finish
                    expect(endp.isDisplayed()).toBeFalsy();
                });
            });
        });

        it('should expand endpoints if link is clicked again', function () {
            swagger.api.getResourceLink().then(function (e) {
                e.click();
                swagger.api.getResourceContent().then(function (endp) {
                    browser.sleep(2000); // wait for animation to finish
                    expect(endp.isDisplayed()).toBeTruthy();
                });
            });
        });

        it('should expand an endpoint if it`s title is clicked', function () {
            swagger.api.getResourceLink().then(function (e) {
                swagger.api.getResourceContent().then(function (endp) {
                    swagger.api.clickEndpoint().then(function () {
                        browser.sleep(2000);
                        swagger.api.getEndpointContent().then(function (content) {
                            expect(content.isDisplayed()).toBeTruthy();
                        });
                    });
                });
            });
        });

        it('should display all expected API end-points', function () {
            var tags = constants.API_ENDPOINTS;
            for (var i = 0; i < tags.length; i++) {
                expect(swagger.getElementByText(tags[i]).isDisplayed()).toBeTruthy();
            }                       
        });
    });
});
