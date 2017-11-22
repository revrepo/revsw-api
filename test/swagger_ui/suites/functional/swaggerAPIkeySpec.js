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
  describe('Swagger UI using API key', function() {

    var apiKey = config.get('swagger.validApiKey');
    var invalidApiKey = config.get('swagger.invalidApiKey');

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
            return endpoint.clickTitle()
              .then(function() {
                return endpoint.clickSubmit()
                  .then(function() {
                    return swagger.waitForElement(swagger
                        .locators
                        .api
                        .resource
                        .endPoints
                        .endPoint
                        .response
                        .responseCode
                        .css)
                      .then(function(data) {
                        expect(endpoint.getResponseCode()).toBe('401');
                        return;
                      });
                  });
              });
          })
          .then(function() {
            done();
          });
      });

    it('should successfully authenticate using a valid API key', function(done) {
      swagger.header.setAPIKey(apiKey)
        .then(function() {
          swagger.header.clickAuthBtn();
          return swagger.waitForText(swagger
              .locators
              .authMsgs
              .success)
            .then(function() {
              return swagger.getSuccessAuthMSG().getText()
                .then(function(text) {
                  return expect(text).toBe(constants.SUCCESSFUL_AUTH_MSG);
                });
            });

        })
        .then(function() {
          done();
        });
    });

    it('should return 200 status code if `Try it out!`' +
      ' button is clicked after authentication',
      function(done) {
        swagger.header.setAPIKey(apiKey)
          .then(function() {
            swagger.header.clickAuthBtn();
            return swagger.waitForText(swagger
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
              });
          })
          .then(function() {
            done();
          });

      });

    it('should successfully logout', function(done) {

      swagger.header.setAPIKey(apiKey)
        .then(function() {
          swagger.header.clickAuthBtn();
          return swagger.waitForText(swagger
              .locators
              .authMsgs
              .success)
            .then(function() {
              expect(swagger.header.getLogoutBtn().isEnabled()).toBeTruthy();
              swagger.header.clickLogoutBtn();
              return expect(swagger.header.getLogoutBtn().isEnabled()).toBeFalsy();
            });
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
            swagger.waitForElement(swagger
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

    it('should fail to authenticate if invalid API key is used', function(done) {
      swagger.header.setAPIKey(invalidApiKey)
        .then(function() {
          swagger.header.clickAuthBtn();
          swagger.waitForText(swagger
              .locators
              .authMsgs
              .fail)
            .then(function() {
              return swagger.getFailAuthMSG().getText()
                .then(function(text) {
                  return expect(text).toBe(constants.FAIL_AUTH_MSG);
                });
            })
            .then(function() {
              done();
            });

        });
    });

  });
});
