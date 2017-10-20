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

var Endpoint = require('./endpoint');
var Locators = require('./../../locators/locators');

var Endpoints = {

    locators: Locators,

    getEndpoints: function () {
        return browser
            .driver
            .findElements(by.className(this.locators.api.resource.endPoints.endPoint.class));
    },

    getEndpoint: function (index) {
        var locs = this.locators;
        return this.getEndpoints().then(function (elems) {
            return new Endpoint(elems[index], locs.api.resource.endPoints.endPoint);
        });

    }
};

module.exports = Endpoints;
