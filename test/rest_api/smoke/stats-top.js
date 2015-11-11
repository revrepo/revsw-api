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
var API = require('./../common/api');

var should = require('should-http');
var request = require('supertest-as-promised');
var config = require('config');

var domains = config.api.stats.domains;
var justtaUser = config.api.users.user;

//  suite
describe('Stats API check:', function () {

  this.timeout(config.api.request.maxTimeout);

  before(function (done) {
    API.session.setCurrentUser(justtaUser);
    done();
  });
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

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'referer' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = status_code', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'status_code' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = cache_status', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'cache_status' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = content_type', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'content_type' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = protocol', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'protocol' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = http_protocol', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'http_protocol' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = http_method', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'http_method' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = content_encoding', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'content_encoding' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = os', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'os' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = device', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'device' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = country', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'country' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

      it('should return data for report_type = QUIC', function(done) {

        API.resources.stats.stats_top
          .getOne(domains.test.id)
          .query({ report_type: 'QUIC' })
          .expect(200)
          .then(function(res) {
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(domains.test.name);
            response_json.metadata.domain_id.should.be.equal(domains.test.id);
            done();
          })
          .catch( function( err ) {
              done( err );
          });
      });

    });
  });


});

