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

    describe('Smoke: ', function () {

      // beforeEach(function (done) {
      //   done();
      // });

      // afterEach(function (done) {
      //   done();
      // });

      it('should return data for report_type = referer', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'referer' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = status_code', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'status_code' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = cache_status', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'cache_status' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = content_type', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'content_type' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = protocol', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'protocol' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = http_protocol', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'http_protocol' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = http_method', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'http_method' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = content_encoding', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'content_encoding' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = os', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'os' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = device', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'device' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = country', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'country' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });

      it('should return data for report_type = QUIC', function(done) {
        request(apiURL)
          .get(apiRequestTop + domains.test.id)
          .auth(users.user.name, users.user.password)
          .query({ report_type: 'QUIC' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          });
      });


    });
  });


});

