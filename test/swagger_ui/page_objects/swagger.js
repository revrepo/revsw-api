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
var Locators = require('./locators/locators');
var Header = require('./header/header');
var API = require('./api/api');
var Constants = require('./constants');

var baseURL = config.swagger.host.protocol + '://' + config.swagger.host.name;

var Swagger = {

    locators: Locators,
    header: Header,
    api: API,
    constants: Constants,
    /**
   * ### Swagger.load()
   *
   * Loads the swagger ui into the browser
   *
   */
    load: function () {
        browser.ignoreSynchronization = true; // don't wait for angular        
        browser.get(baseURL);
        browser.sleep(5000); //wait for resources to load
    },

    /* Global swagger methods */
    getWrapper: function () {
        return browser.driver.findElement(by.className(this.locators.wrapper.class));
    },

    isDisplayed: function () {
        return this.getWrapper().isDisplayed();
    },

    getSuccessAuthMSG: function () {
        return browser
            .driver
            .findElement(by.css(this
                .locators
                .authMsgs
                .success
                .css));
    },

    getFailAuthMSG: function () {

        return browser
            .driver
            .findElement(by.css(this
                .locators
                .authMsgs
                .fail
                .css));
    },

    loginAPI: function (key) {
        this.header.setAPIKey(key);
        return this.header.clickAuthBtn();
    },

    logout: function () {
        return this.header.clickLogoutBtn();
    },

    getElementByText: function (text) {
        return browser.driver.findElement(by.xpath('.//*[.="' + text + '"]'));
    },

    waitForElement: function (cssLocator, callback) {
        var handler = setInterval(function () {
            browser.isElementPresent(by.css(cssLocator)).then(function (vis) {
                if (vis) {
                    callback();
                    clearInterval(handler);
                }
            });
        }, 1000);
    },

    waitForText: function (locator, callback) {
        var handler = setInterval(function () {
            browser
                .isElementPresent(by
                    .cssContainingText(locator.css, locator.linkText)).then(function (vis) {
                        if (vis) {
                            callback();
                            clearInterval(handler);
                        }
                    });
        }, 1000);
    }
};

module.exports = Swagger;