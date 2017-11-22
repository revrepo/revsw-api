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
var SchemaProvider = require('./../../../common/providers/schema/api');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.reseller')
  ];
  var errorResponseSchema = SchemaProvider.getErrorResponse();

  users.forEach(function (user) {

    var testDashboard;

    describe('With user: ' + user.role, function () {

      describe('Dashboards resource', function () {
        describe('Error Response Data Schema', function () {

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

          it('should return data applying `error response` schema when ' +
            'getting all dashboards without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dashboards
                .getAll()
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'getting specific dashboard without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dashboards
                .getOne(testDashboard.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'creating specific dashboard without authentication.',
            function (done) {
              var newDashboard = API.providers.data.dashboards.generateOne();
              API.session.reset();
              API.resources.dashboards
                .createOne(newDashboard)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'updating specific dashboard without authentication.',
            function (done) {
              var updatedDashboard = API.providers.data.dashboards
                .generateOneForUpdate(testDashboard);
              API.session.reset();
              API.resources.dashboards
                .update(testDashboard.id, updatedDashboard)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

          it('should return data applying `error response` schema when ' +
            'deleting an dashboard without authentication.',
            function (done) {
              API.session.reset();
              API.resources.dashboards
                .deleteOne(testDashboard.id)
                .expect(401)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, errorResponseSchema, done);
                })
                .catch(done);
            });

        });
      });
    });
  });
});
