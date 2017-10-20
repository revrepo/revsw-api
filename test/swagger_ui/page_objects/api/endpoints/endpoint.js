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

var Endpoint = function (endpoint, locators) {

    // Properties
    this.endpoint = endpoint;
    this.locators = locators;

    this.getTitle = function () {
        return browser.driver.findElement(by.css(this.locators.title.css));
    };

    this.clickTitle = function () {
        return this.getTitle().click();
    };

    this.getSubmit = function () {
        return browser.driver.findElement(by.className(this.locators.submitBtn.class));
    };

    this.clickSubmit = function () {
        return this.getSubmit().click();
    };

    this.getResponseCode = function () {
        return browser
            .driver
            .findElement(by.css(this
                .locators
                .response
                .responseCode
                .css)).getText().then((code) => {
                    return code;
                });
    };
};

module.exports = Endpoint;
