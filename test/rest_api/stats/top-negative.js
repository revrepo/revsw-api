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

// ### Requiring common components to use in our spec/test.
// var API = require('./../common/api');
// var DataProvider = require('./../common/providers/data');



var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');
var config = require('config');

var apiURL = config.api.host.protocol + '://' + config.api.host.name;
var apiRequest = '/' + config.api.version + '/' + config.api.stats.request + '/';
var apiRequestTop = apiRequest + 'top/';
var users = config.api.stats.users;
var domains = config.api.stats.domains;

//  suite
describe('Stats API check:', function () {

  this.timeout(config.api.request.maxTimeout);

  // before(function (done) {
  //   done();
  // });
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

      it('should fail if report_type is not set', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });

      it('should fail if report_type is set to some junk value', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'motherfucking-referer' })
          .expect(400)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });

      it('should fail if report period exceeds 24h', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ 'from_timestamp': '-72h', 'to_timestamp': '-2h' })
          .expect(400)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });


    });
  });


});

