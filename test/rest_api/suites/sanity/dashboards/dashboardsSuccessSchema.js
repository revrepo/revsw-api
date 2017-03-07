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
var Joi = require('joi');

var config = require('config');
var API = require('./../../../common/api');
// var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

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
        describe('Success Response Data Schema', function () {

          before(function (done) {
            API.helpers
              .authenticateUser(user)
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

          it('should return data applying expected schema when getting all ' +
            'dashboards.',
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
                  var schema = API.providers.schema.dashboards.getForGetAll();
                  Joi.validate(dashboards, schema, done);
                })
                .catch(done);
            });

          it('should return data applying expected schema when getting specific ' +
            'dashboard.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dashboards
                    .getOne(testDashboard.id)
                    .expect(200);
                })
                .then(function (response) {
                  var dashboard = response.body;
                  var schema = API.providers.schema.dashboards.getForGetOne();
                  Joi.validate(dashboard, schema, done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'creating specific dashboard.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.resources.dashboards
                    .createOne(API.providers.data.dashboards.generateOne())
                    .expect(200);
                })
                .then(function (response) {
                  var dashboard = response.body;
                  var schema = API.providers.schema.dashboards.getForCreate();
                  Joi.validate(dashboard, schema, done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'updating specific dashboard.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.helpers.dashboards.createOne();
                })
                .then(function (dashboard) {
                  var updatedDashboard = API.providers.data.dashboards
                    .generateOneForUpdate(dashboard);
                  return API.resources.dashboards
                    .update(dashboard.id, updatedDashboard)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  var schema = API.providers.schema.dashboards.getForUpdate();
                  Joi.validate(data, schema, done);
                })
                .catch(done);
            });

          it('should return data applying `success response` schema when ' +
            'deleting an dashboard.',
            function (done) {
              API.helpers
                .authenticateUser(user)
                .then(function () {
                  return API.helpers.dashboards.createOne();
                })
                .then(function (dashboard) {
                  return API.resources.dashboards
                    .deleteOne(dashboard.id)
                    .expect(200);
                })
                .then(function (response) {
                  var data = response.body;
                  var schema = API.providers.schema.dashboards.getForDelete();
                  Joi.validate(data, schema, done);
                })
                .catch(done);
            });
        });
      });
    });
  });
});
