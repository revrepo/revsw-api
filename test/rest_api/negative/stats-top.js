/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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
'use strict';
// ### Requiring common components to use in our spec/test.
var API = require('./../common/api');

var should = require('should-http');
var request = require('supertest-as-promised');
var config = require('config');

var domains = config.api.stats.domains;
var justtaUser = config.api.users.user;
var someone = config.api.users.nobody;

//  suite
describe('Stats API check:', function () {

  this.timeout(config.api.request.maxTimeout);

  before(function (done) {
    return API.resources.authenticate
      .createOne({ email: justtaUser.name, password: justtaUser.password })
      .then(function(response) {
        justtaUser.token = response.body.token;
        API.session.setCurrentUser(justtaUser);
        done();
      });
  });
  // after(function (done) {
  //   done();
  // });

  describe('Top requests: ', function () {

    describe('Negative: ', function () {

      // beforeEach(function (done) {
      //   done();
      // });

      // afterEach(function (done) {
      //   done();
      // });

      it('should fail if creds are wrong or absent', function(done) {

        API.session.setCurrentUser(someone);
        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .expect(401)
          .then( function() {
            API.session.setCurrentUser(false);
            return API.resources.stats.stats_top
              .getOne(domains.test.id)
              .expect(401)
              .then( function() {
                done();
              });
          }).catch( function( err ) {
            done( err );
          }).finally( function() {
            API.session.setCurrentUser(justtaUser);
          });
      });

      it('should fail if report_type is not set', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .expect(400, done);
      });

      it('should fail if report_type is set to some junk value', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'motherfucking-referer' })
          .expect(400, done);
      });

      it('should fail if report period exceeds 24h', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ 'from_timestamp': '-72h', 'to_timestamp': '-2h' })
          .expect(400, done);
      });

    });
  });


});

