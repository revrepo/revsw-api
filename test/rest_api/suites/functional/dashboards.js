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

require('should-http');

var config = require('config');
var API = require('./../../common/api');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var reseller = config.get('api.users.reseller');
  var secondReseller = config.get('api.users.secondReseller');
  var users = [
    reseller
  ];

  users.forEach(function (user) {

    var secondTestDashboard;
    var testDashboard;

    describe('With user: ' + user.role, function () {

      describe('Dashboards resource', function () {

        before(function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              return API.helpers.dashboards.createOne();
            })
            .then(function (dashboard) {
              testDashboard = dashboard;
              return API.helpers
                .authenticateUser(secondReseller)
                .then(function () {
                  return API.helpers.dashboards.createOne();
                });
            })
            .then(function (dashboard) {
              secondTestDashboard = dashboard;
              done();
            })
            .catch(done);
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

        it('should not allow to get dashboards from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.dashboards
                  .getAll()
                  .expect(200);
              })
              .then(function (response) {
                var dashboards = response.body;
                dashboards.forEach(function (dashboard) {
                  dashboard.id.should.not.equal(secondTestDashboard.id);
                });
                done();
              })
              .catch(done);
          });

        it('should not allow to get specific dashboard from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.dashboards
                  .getOne(secondTestDashboard.id)
                  .expect(400);
              })
              .then(function (response) {
                response.body.message.should.equal('Dashboard ID not found');
                done();
              })
              .catch(done);
          });

        it('should not allow to update an dashboard from other user.',
          function (done) {
            var updatedDashboard = API.providers.data.dashboards
              .generateOneForUpdate(secondTestDashboard);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.dashboards
                  .update(secondTestDashboard.id, updatedDashboard)
                  .expect(400);
              })
              .then(function (response) {
                response.body.error.should.equal('Bad Request');
                response.body.message.should.equal('Dashboard not found');
                done();
              })
              .catch(done);
          });

        it('should not allow to delete an dashboard from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.dashboards
                  .deleteOne(secondTestDashboard.id)
                  .expect(400);
              })
              .then(function (response) {
                response.body.error.should.equal('Bad Request');
                response.body.message.should.equal('Dashboard ID not found');
                done();
              })
              .catch(done);
          });
      });
    });
  });
});
