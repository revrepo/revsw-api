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
var Header = {

    locators: Locators,

    getAuthViaDropdown: function () {
        return browser.driver.findElement(by.id(this.locators.header.authViaDropdown.id));
    },

    getAPIKeyInput: function () {
        return browser.driver.findElement(by.id(this.locators.header.apiKeyInput.id));
    },

    getAuthBtn: function () {
        return browser.driver.findElement(by.id(this.locators.header.authBtn.id));
    },

    getLogoutBtn: function () {
        return browser.driver.findElement(by.id(this.locators.header.logoutBtn.id));
    }
};

module.exports = Header;