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
var swagger = require('../../page_objects/swagger');
var constants = require('../../page_objects/constants');

describe('Functional', function() {
  describe('Swagger UI using user', function() {

    var user = config.get('swagger.users.revAdmin');

    beforeEach(function() {
      swagger.load();
      // disable animations
      browser.executeScript('jQuery.fx.off=true;');
      browser.ignoreSynchronization = true;
    });

    it('should return 401 status code if `Try it out!`' +
      ' button is clicked without authentication',
      function(done) {
        swagger.api.endpoints.getEndpoint(0)
          .then(function(endpoint) {
            endpoint.clickTitle();
            endpoint.clickSubmit();
            return swagger.waitForElement(swagger
                .locators
                .api
                .resource
                .endPoints
                .endPoint
                .response
                .responseCode
                .css)
              .then(function() {
                return expect(endpoint.getResponseCode()).toBe('401');
              });
          })
          .then(function() {
            done();
          });
      });

    it('should successfully authenticate using a valid user', function(done) {
      swagger.header.setAuthVia('Username/Password');
      // swagger.header.clickAuthBtn();
      swagger.header.setUsername(user.email);
      swagger.header.setPassword(user.password);
      swagger.header.clickAuthBtn();
      swagger.waitForText(swagger
          .locators
          .authMsgs
          .success)
        .then(function() {
          return swagger.getSuccessAuthMSG().getText()
            .then(function(text) {
              return expect(text).toBe(constants.SUCCESSFUL_AUTH_MSG);
            });
        })
        .then(function() {
          done();
        });

    });

    it('should return 200 status code if `Try it out!`' +
      ' button is clicked after authentication',
      function(done) {
        swagger.header.setAuthVia('Username/Password');
        swagger.header.clickAuthBtn();
        swagger.header.setUsername(user.email);
        swagger.header.setPassword(user.password);
        swagger.header.clickAuthBtn();
        swagger.waitForText(swagger
            .locators
            .authMsgs
            .success)
          .then(function() {
            return swagger.api.endpoints.getEndpoint(0)
              .then(function(endpoint) {
                endpoint.clickTitle();
                endpoint.clickSubmit();
                return swagger.waitForElement(swagger
                    .locators
                    .api
                    .resource
                    .endPoints
                    .endPoint
                    .response
                    .responseCode
                    .css)
                  .then(function() {
                    return expect(endpoint.getResponseCode()).toBe('200');
                  });
              });
          })
          .then(function() {
            done();
          });
      });

    it('should successfully logout', function(done) {
      swagger.header.setAuthVia('Username/Password');
      swagger.header.clickAuthBtn();
      swagger.header.setUsername(user.email);
      swagger.header.setPassword(user.password);
      swagger.header.clickAuthBtn();
      swagger.waitForText(swagger
          .locators
          .authMsgs
          .success)
        .then(function() {
          expect(swagger.header.getLogoutBtn().isEnabled()).toBeTruthy();
          swagger.header.clickLogoutBtn();
          return expect(swagger.header.getLogoutBtn().isEnabled()).toBeFalsy();
        })
        .then(function() {
          done();
        });
    });

    it('should return 401 status code if `Try it out!`' +
      ' button is clicked after logout',
      function(done) {
        swagger.api.endpoints.getEndpoint(0)
          .then(function(endpoint) {
            endpoint.clickTitle();
            endpoint.clickSubmit();
            return swagger.waitForElement(swagger
                .locators
                .api
                .resource
                .endPoints
                .endPoint
                .response
                .responseCode
                .css)
              .then(function() {
                return expect(endpoint.getResponseCode()).toBe('401');
              });
          })
          .then(function() {
            done();
          });
      });
  });
});
