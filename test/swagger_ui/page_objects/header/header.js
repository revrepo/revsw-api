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
var Constants = require('../constants');
var Locators = require('../locators/locators');
var Header = {

    locators: Locators,
    constants: Constants,

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
    },

    setAPIKey: function (value) {
      var element_ = this.getAPIKeyInput();
      element_.clear();
      return element_.sendKeys(''+value);
    },

    clickAuthBtn: function () {
        return this.getAuthBtn().click();
    },

    clickLogoutBtn: function () {
        return this.getLogoutBtn().click();
    },

    setAuthVia: function (value) {
        this.getAuthViaDropdown().click();
        return element(by.cssContainingText('option', value)).click();
    },

    getUsernameInput: function () {
        return browser.driver.findElement(by.id(this.locators.header.userInput.id));
    },

    getPasswordInput: function () {
        return browser.driver.findElement(by.id(this.locators.header.passInput.id));
    },

    setUsername: function (value) {
        return this.getUsernameInput().sendKeys(value);
    },

    setPassword: function (value) {
        return this.getPasswordInput().sendKeys(value);
    }
};

module.exports = Header;
