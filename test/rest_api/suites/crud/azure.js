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

        it('should get Subscriptions list with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var subscriptions = res.body;
                    subscriptions.should.not.be.undefined();
                    subscriptions.length.should.greaterThanOrEqual(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should get Resources list with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .resources()
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var resources = res.body;
                    resources.should.not.be.undefined();
                    resources.length.should.greaterThanOrEqual(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should get Resources list in resourceGroup with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .resourceGroups()
                  .providers()
                  .accounts() 
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var providers = res.body;
                    providers.should.not.be.undefined();
                    providers.length.should.greaterThanOrEqual(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should get Resources list in subscription with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .subscriptions()
                  .providers()
                  .accounts() 
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var providers = res.body;
                    providers.should.not.be.undefined();
                    providers.length.should.greaterThanOrEqual(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should get specific Resource with revAdmin role.', 
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.azure
                  .resources()
                  .getAll()
                  .then(function (response) {
                    var resources = response.body;
                    API.resources.resources
                      .getOne(resources[0].id)
                      .expect(200)
                      .then(function (res) {
                        var resource = res.body;
                        resource.should.not.be.undefined();
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
