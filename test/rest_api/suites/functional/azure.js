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

describe('Functional check', function () {

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
                    subscriptionsArray.length.should.equal(2);
                    subscriptionsArray[1].id.should.be.equal('57d1bc682cb764db03d9a06a');
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
                    resourcesArray.length.should.equal(25);
                    resourcesArray[24].resource_name.should.be.equal('r2');
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
                    providersArray.length.should.equal(21);
                    providersArray[20].plan_name.should.be.equal('free');
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
                    providersArray.length.should.equal(21);
                    providersArray[20].name.should.be.equal('r2');
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
                    res.body.resource_name.should.equal('r2');
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
