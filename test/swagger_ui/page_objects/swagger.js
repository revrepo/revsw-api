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
var BROWSER_WAIT_TIMEOUT = 10000;
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
  load: function() {
    browser.ignoreSynchronization = true; // don't wait for angular
    browser.get(baseURL);
    browser.sleep(5000); //wait for resources to load
  },

  /* Global swagger methods */
  getWrapper: function() {
    return browser.driver.findElement(by.className(this.locators.wrapper.class));
  },

  isDisplayed: function() {
    return this.getWrapper().isDisplayed();
  },

  getSuccessAuthMSG: function() {
    var self = this;
    return browser
      .driver
      .findElement(by.css(self
        .locators
        .authMsgs
        .success
        .css));
  },

  getFailAuthMSG: function() {

    return browser
      .driver
      .findElement(by.css(this
        .locators
        .authMsgs
        .fail
        .css));
  },

  loginAPI: function(key) {
    this.header.setAPIKey(key);
    return this.header.clickAuthBtn();
  },

  logout: function() {
    return this.header.clickLogoutBtn();
  },

  getElementByText: function(text) {
    return browser.driver.findElement(by.xpath('.//*[.="' + text + '"]'));
  },

  waitForElement: function(cssLocator) {
    var timeout = BROWSER_WAIT_TIMEOUT;
    var self = this;
    var el_ = by.css(cssLocator);
    return browser.wait(function() {
      return browser.isElementPresent(el_);
    }, timeout);
  },

  waitForText: function(locator) {
    var timeout = BROWSER_WAIT_TIMEOUT;
    var self = this;
    return browser.wait(function() {
      return (browser.isElementPresent(by.id(locator.id)) &&
        browser.driver.findElement(by.id(locator.id)).getText()
        .then(function(val) {
          return val !== '';
        }));
    }, timeout, 'Not found selector ' + locator.css + ' text ' + locator.linkText + ' and id' + locator.id);
  },

  scrollToElement: function(element_) {
    return browser.executeScript('arguments[0].scrollIntoView(true);', element_)
      .then(function() {
        return element_;
      });
  }

};

module.exports = Swagger;
