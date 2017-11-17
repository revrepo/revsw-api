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

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin')
  ];

  users.forEach(function (user) {

    describe('With user: ' + user.role, function () {

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

        xit('should load Subscriptions list with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.subscriptions
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var subscriptionsArray = res.body;
                    subscriptionsArray.should.be.not.empty();
                    subscriptionsArray[1].id.should.be.not.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should load Resources list with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.resources
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var resourcesArray = res.body;
                    resourcesArray.should.be.not.empty();
                    resourcesArray[24].resource_name.should.be.not.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should load Resources list in resourceGroup with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.resourceGroups
                  .providers()
                  .accounts() 
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var providersArray = res.body;
                    providersArray.should.be.not.empty();
                    providersArray[20].plan_name.should.be.not.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should load Resources list in subscription with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.subscriptions
                  .providers()
                  .accounts() 
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var providersArray = res.body;
                    providersArray.should.be.not.empty();
                    providersArray[20].name.should.be.not.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should load specific Resource with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.resources
                  .getOne('590f48146550d63ae698029c')
                  .expect(200)
                  .then(function (res) {
                    res.body.should.not.be.empty();
                    res.body.resource_name.should.not.be.empty();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
