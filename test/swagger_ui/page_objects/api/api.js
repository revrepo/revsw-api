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
var config = require('config');

var Locators = require('../locators/locators');
var Endpoints = require('./endpoints/endpoints');
var API = {

    //TODO: write comments for all methods
    endpoints: Endpoints,
    locators: Locators,

    getContainer: function () {
        return browser.driver.findElement(by.id(this.locators.api.container.id));
    },

    getTitle: function () {
        return browser.driver.findElement(by.className(this.locators.api.title.class));
    },

    getResources: function () {
        return browser.driver.findElements(by.className(this.locators.api.resource.class));
    },

    getResourcesCount: function () {
        return this.getResources().then(function (elems) {
            return elems.length;
        });
    },

    getFirstResource: function () {
        return this.getResources().then(function (elems) {
            return elems[0];
        });
    },

    getResourceByTitle: function (resourceTitle) {
        var locs = this.locators;
        this.getResources().then(function (elems) {
            for (var i = 0; i < elems.length; i++) {
                var elem = elems[i];
                var title = elem
                    .findElement(by
                        .cssContainingText(locs
                            .api
                            .resource
                            .resourceTitle
                            .css, resourceTitle));
                if (title.isPresent()) {
                    return elem;
                }
            }
        });

        return null;
    },

    getResourceLink: function (resourceTitle) {
        var locs = this.locators;
        if (resourceTitle === undefined) {
            return this.getFirstResource().then(function (res) {
                return res.findElement(by.css(locs.api.resource.resourceTitle.css));
            });
        } else {
            return this.getResourceByTitle(resourceTitle).then(function (res) {
                return res.findElement(by.css(locs.api.resource.resourceTitle.css));
            });
        }
    },

    getResourceContent: function (resourceTitle) {
        var locs = this.locators;
        if (resourceTitle === undefined) {
            return this.getFirstResource().then(function (res) {
                return res.findElement(by.className(locs.api.resource.content.class));
            });
        } else {
            return this.getResourceByTitle(resourceTitle).then(function (res) {
                return res.findElement(by.className(locs.api.resource.content.class));
            });
        }
    },

    getResourceEndpointsContainer: function (resourceTitle) {
        var locs = this.locators;
        if (resourceTitle === undefined) {
            return this.getFirstResource().then(function (res) {
                return res.findElement(by.className(locs.api.resource.endPoints.container.class));
            });
        } else {
            return this.getResourceByTitle(resourceTitle).then(function (res) {
                return res.findElement(by.className(locs.api.resource.endPoints.container.class));
            });
        }
    },

    getEndpoint: function (resourceTitle) {
        var locs = this.locators;
        if (resourceTitle === undefined) {
            return this.getFirstResource().then(function (res) {
                return res.findElement(by.css(locs.api.resource.endPoints.endPoint.title.css));
            });
        } else {
            return this.getResourceByTitle(resourceTitle).then(function (res) {
                return res.findElement(by.css(locs.api.resource.endPoints.endPoint.title.css));
            });
        }
    },

    getEndpointContainer: function (resourceTitle) {
        var locs = this.locators;
        if (resourceTitle === undefined) {
            return this.getFirstResource().then(function (res) {
                return res.findElement(by.className(locs
                    .api
                    .resource
                    .endPoints
                    .endPoint                    
                    .class));
            });
        } else {
            return this.getResourceByTitle(resourceTitle).then(function (res) {
                return res.findElement(by.className(locs
                    .api
                    .resource
                    .endPoints
                    .endPoint                    
                    .class));
            });
        }
    },

    clickEndpoint: function (resourceTitle) {
        return this.getEndpoint(resourceTitle).then(function (e) {
            return e.click();
        });
    },

    getEndpointContent: function (resourceTitle) {
        var locs = this.locators;
        return this.getEndpointContainer(resourceTitle).then(function (e) {
            return e.findElement(by.className(locs.api.resource.endPoints.endPoint.content.class));
        });
    },

    isDisplayed: function () {
        return this.getTitle().isDisplayed();
    }
};

module.exports = API;