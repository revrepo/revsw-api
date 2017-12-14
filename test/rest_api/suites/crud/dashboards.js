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

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    var testDashboard;

    describe('With user: ' + user.role, function () {

      describe('Dashboards resource', function () {

        before(function (done) {
          API.identity
            .authenticate(user)
            .then(function () {
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

        it('should allow to get all dashboards.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.dashboards
                  .getAll()
                  .expect(200);
              })
              .then(function (response) {
                var dashboards = response.body;
                dashboards.should.not.be.empty();
                dashboards.length.should.greaterThan(0);
                done();
              })
              .catch(done);
          });

        it('should allow to get specific dashboard.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.dashboards
                  .getOne(testDashboard.id)
                  .expect(200);
              })
              .then(function (response) {
                var dashboard = response.body;
                dashboard.id.should.equal(testDashboard.id);
                done();
              })
              .catch(done);
          });

        it('should allow to create a dashboard.',
          function (done) {
            var newDashboard = API.providers.data.dashboards.generateOne();
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.dashboards
                  .createOne(newDashboard)
                  .expect(200);
              })
              .then(function (response) {
                response.body.statusCode.should.equal(200);
                response.body.object_id.should.not.be.empty();
                done();
              })
              .catch(done);
          });

        it('should allow to update a dashboard.',
          function (done) {
            var newDashboard = API.providers.data.dashboards.generateOne();
            var updatedDashboard = API.providers.data.dashboards
              .generateOneForUpdate(newDashboard);
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.dashboards
                  .createOne(newDashboard);
              })
              .then(function (response) {
                return API.resources.dashboards
                  .update(response.body.object_id, updatedDashboard)
                  .expect(200);
              })
              .then(function (response) {
                response.body.statusCode.should.equal(200);
                response.body.message.should.equal('Successfully updated the ' +
                  'Dashboard');
                done();
              })
              .catch(done);
          });

        it('should allow to delete a dashboard.',
          function (done) {
            var newDashboard = API.providers.data.dashboards.generateOne();
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.dashboards
                  .createOne(newDashboard);
              })
              .then(function (response) {
                return API.resources.dashboards
                  .deleteOne(response.body.object_id)
                  .expect(200);
              })
              .then(function (response) {
                response.body.statusCode.should.equal(200);
                response.body.message.should.equal('Successfully deleted the ' +
                  'Dashboard');
                done();
              })
              .catch(done);
          });
      });
    });
  });
});
