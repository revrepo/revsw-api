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

      it('should return data without query', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          // .query({ report_type: 'referer' })
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

      it('should return data for status_code', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ status_code: 200 })
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

      it('should return data for cache_code', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ cache_code: 'HIT' })
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

      it('should return data for request_status', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ request_status: 'OK' })
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

      it('should return data for protocol', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ protocol: 'HTTPS' })
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

      it('should return data for http_method', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ http_method: 'GET' })
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

      it('should return data for quic', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ quic: 'QUIC' })
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

      it('should return data for country', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ country: 'ZU' })
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

      it('should return data for os', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ os: 'Windows' })
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

      it('should return data for device', function(done) {

        API.resources.stats.stats_top_objects
          .getOne(domains.test.id)
          .query({ device: 'Motorola' })
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

