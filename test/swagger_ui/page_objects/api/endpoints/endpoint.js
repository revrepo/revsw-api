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
var BROWSER_WAIT_TIMEOUT = 10000;

var Endpoint = function(endpoint, locators) {

  // Properties
  this.endpoint = endpoint;
  this.locators = locators;

  this.getTitle = function() {
    return browser.driver.findElement(by.css(this.locators.title.css));
  };

  this.clickTitle = function() {
    var self = this;
    var element_ = self.getTitle();
    return self.scrollToElement(element_)
      .then(function() {
        return element_.click();
      });
  };

  this.getSubmit = function() {
    var self = this;
    return browser.driver.findElement(by.className(self.locators.submitBtn.class));
  };

  this.clickSubmit = function() {
    var self = this;
    var element_ = self.getSubmit();
    return self.scrollToElement(element_)
      .then(function() {
        return element_.click();
      });

  };

  this.getResponseCode = function(milliseconds) {
    var self = this;
    var timeout = milliseconds || BROWSER_WAIT_TIMEOUT;
    return browser.wait(function() {
    var element_ = browser
      .driver
      .findElement(by.css(self
        .locators
        .response
        .responseCode
        .css));

    return self.scrollToElement(element_)
      .then(function(){
        return element_.getText().then(function(code) {
          return code;
        });
      });
    }, timeout);
  };

  this.getResponseCodeContainer = function() {
    return browser
      .driver
      .findElement(by.css(this
        .locators
        .response
        .responseCode
        .css));
  };

  this.scrollToElement = function(element_) {
    return browser.executeScript('arguments[0].scrollIntoView(true);',
      element_).then(function(){
        return element_;
      });
  };
};

module.exports = Endpoint;
