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
var DashboardsDP = require('./../../common/providers/data/dashboards');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    //var testAccount;
    var testDashboard;

    describe('With user: ' + user.role, function () {

      describe('Dashboards resource', function () {

        before(function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
            //  return API.helpers.accounts.createOne();
            //})
            //.then(function (newAccount) {
            //  testAccount = newAccount;
              return API.helpers.dashboards.createOne();
            })
            .then(function (dashboard) {
              testDashboard = dashboard;
            })
            .then(done)
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

        it('should return a response when getting all dashboards.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.dashboards
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when getting specific dashboard.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.dashboards
                  .getOne(testDashboard.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a response when creating an dashboard.',
          function (done) {
            var newDashboard = DashboardsDP.generateOne();
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.dashboards
                  .createOne(newDashboard)
                  .expect(200)
                  .then(function (response) {
                    // Delete dashboard
                    API.resources.dashboards
                      .deleteOne(response.body.object_id)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
        //
        //it('should return a response when updating an dashboard.',
        //  function (done) {
        //    var newDashboard = DashboardsDP.generateOne(testAccount.id, 'NEW');
        //    var updatedDashboard = DashboardsDP
        //      .generateOneForUpdate(testAccount.id, 'UPDATED');
        //    API.helpers
        //      .authenticateUser(user)
        //      .then(function () {
        //        return API.resources.dashboards.createOneAsPrerequisite(newDashboard);
        //      })
        //      .then(function (response) {
        //        API.resources.dashboards
        //          .update(response.body.id, updatedDashboard)
        //          .expect(200)
        //          .end(done);
        //      })
        //      .catch(done);
        //  });
        //
        //it('should return a response when deleting an dashboard.',
        //  function (done) {
        //    var newDashboard = DashboardsDP.generateOne(testAccount.id, 'NEW');
        //    API.helpers
        //      .authenticateUser(user)
        //      .then(function () {
        //        return API.resources.dashboards.createOneAsPrerequisite(newDashboard);
        //      })
        //      .then(function (response) {
        //        API.resources.dashboards
        //          .deleteOne(response.body.id)
        //          .expect(200)
        //          .end(done);
        //      })
        //      .catch(done);
        //  });
      });
    });
  });
});
