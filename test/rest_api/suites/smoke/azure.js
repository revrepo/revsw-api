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

require('should-http');

var config = require('config');
var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));


  var RevAdmin = config.get('api.users.revAdmin');

      describe('Azure resource', function () {

        before(function (done) {
          done();
        });

        after(function (done) {
          done();
        });

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

       it('should return a success response when getting all subscriptions.', 
          function (done) {
            API.helpers
              .attemptToAuthenticateUser(RevAdmin)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

       it('should return a success response when getting all resources.', 
          function (done) {
            API.helpers
              .attemptToAuthenticateUser(RevAdmin)
              .then(function () {
                API.resources.azure
                  .resources()
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        xit('should return a success response when getting all resources in resourceGroup.', 
          function (done) {
            API.helpers
              .authenticateUser(RevAdmin)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups()
                  .providers()
                  .accounts() 
                  .getAll().then(function(response){
                    console.log(response);
                  })
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        xit('should return a success response when getting all resources in subscription.', 
          function (done) {
            API.helpers
              .authenticateUser(RevAdmin)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .providers()
                  .accounts() 
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        xit('should return a success response when getting specific resource.', 
          function (done) {
            API.helpers
              .authenticateUser(RevAdmin)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .resourceGroups()
                  .providers()
                  .accounts() 
                  .getAll()
                  .end(done);
              })
              .catch(done);
          });
      });
    });

