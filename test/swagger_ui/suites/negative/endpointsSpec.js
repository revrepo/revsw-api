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

describe('Negative', function () {
    describe('API End-points', function () {

        beforeAll(function () {
            swagger.load();
        });

        it('should not display unexpected API end-points', function () {
            /*jshint loopfunc: true */
            swagger.api.endpoints.getEndpoints().then(function (endpoints) {
                for (var i = 0; i < endpoints.length; i++) {
                    endpoints[i].findElement(by.css(swagger
                        .locators
                        .api
                        .resource
                        .endPoints
                        .endPoint
                        .title
                        .css)).getText().then(function (text) {
                            // TODO: should we console.log an unexpected end-point?
                            expect(constants.API_ENDPOINTS.indexOf(text)).toBeGreaterThan(-1);
                        });
                }
            });
        });
    });
});
