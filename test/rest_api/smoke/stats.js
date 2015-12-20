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
      })
      .catch( function( err ) {
        done( err );
      });
  });
  // after(function (done) {
  //   done();
  // });

  describe('Smoke tests: ', function () {


    describe('Top objects: ', function () {

      // beforeEach(function (done) {
      //   done();
      // });

      // afterEach(function (done) {
      //   done();
      // });

      var run_ = function( q ) {

        return function( done ) {
          API.resources.stats.stats_top_objects
            .getOne(domains.test.id)
            .query( q )
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
        };
      };

      xit('should return data without query', run_({}) );
      xit('should return data for status_code', run_({ status_code: 200 }) );
      xit('should return data for cache_code', run_({ cache_code: 'HIT' }) );
      xit('should return data for request_status', run_({ request_status: 'OK' }) );
      xit('should return data for protocol', run_({ protocol: 'HTTPS' }) );
      xit('should return data for http_method', run_({ http_method: 'GET' }) );
      xit('should return data for quic', run_({ quic: 'QUIC' }) );
      xit('should return data for HTTP2', run_({ http2: 'h2' }) );
      xit('should return data for country', run_({ country: 'ZU' }) );
      xit('should return data for os', run_({ os: 'Windows' }) );
      xit('should return data for device', run_({ device: 'Motorola' }) );
    });

    describe('Top: ', function () {

      // beforeEach(function (done) {
      //   done();
      // });

      // afterEach(function (done) {
      //   done();
      // });
      var run_ = function( type, domain_name, domain_id ) {

        return function( done ) {
          API.resources.stats.stats_top
            .getOne(domain_id)
            .query({ report_type: type })
            .expect(200)
            .then(function(res) {
              var response_json = JSON.parse(res.text);
              response_json.metadata.domain_name.should.be.equal(domain_name);
              response_json.metadata.domain_id.should.be.equal(domain_id);
              done();
            })
            .catch( function( err ) {
                done( err );
            });
        };
      };

      xit('should return data for report_type = referer',
        run_( 'referer', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = status_code',
        run_( 'status_code', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = cache_status',
        run_( 'cache_status', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = content_type',
        run_( 'content_type', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = protocol',
        run_( 'protocol', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = http_protocol',
        run_( 'http_protocol', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = http_method',
        run_( 'http_method', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = content_encoding',
        run_( 'content_encoding', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = os',
        run_( 'os', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = device',
        run_( 'device', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = country',
        run_( 'country', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = QUIC',
        run_( 'QUIC', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = http2',
        run_( 'http2', domains.test.name, domains.test.id ) );
    });

    describe('Stats: ', function () {

      // beforeEach(function (done) {
      //   done();
      // });

      // afterEach(function (done) {
      //   done();
      // });

      var run_ = function( q, domain_name, domain_id ) {

        return function( done ) {
          API.resources.stats.stats
            .getOne(domain_id)
            .query( q )
            .expect(200)
            .then(function(res) {
              var response_json = JSON.parse(res.text);
              response_json.metadata.domain_name.should.be.equal(domain_name);
              response_json.metadata.domain_id.should.be.equal(domain_id);
              done();
            })
            .catch( function( err ) {
                console.log( err );
                console.log( 'query: ', q );
                console.log( 'domain_name: ', domain_name );
                console.log( 'domain_id: ', domain_id );
                done( err );
            });
        };
      };

      xit('should return data without query', run_({}, domains.test.name, domains.test.id ) );
      xit('should return data for status_code', run_({ status_code: 200 }, domains.test.name, domains.test.id ) );
      xit('should return data for cache_code', run_({ cache_code: 'HIT' }, domains.test.name, domains.test.id ) );
      xit('should return data for request_status', run_({ request_status: 'OK' }, domains.test.name, domains.test.id ) );
      xit('should return data for protocol', run_({ protocol: 'HTTPS' }, domains.test.name, domains.test.id ) );
      xit('should return data for http_method', run_({ http_method: 'GET' }, domains.test.name, domains.test.id ) );
      xit('should return data for quic', run_({ quic: 'QUIC' }, domains.test.name, domains.test.id ) );
      xit('should return data for country', run_({ country: 'ZU' }, domains.test.name, domains.test.id ) );
      xit('should return data for os', run_({ os: 'Windows' }, domains.test.name, domains.test.id ) );
      xit('should return data for device', run_({ device: 'Motorola' }, domains.test.name, domains.test.id ) );
    });

    describe('Lastmile RTT: ', function () {

      var run_ = function( type, domain_name, domain_id ) {

        return function( done ) {
          API.resources.stats.stats_lastmile_rtt
            .getOne(domain_id)
            .query({ report_type: type })
            .expect(200)
            .then(function(res) {
              var response_json = JSON.parse(res.text);
              response_json.metadata.domain_name.should.be.equal(domain_name);
              response_json.metadata.domain_id.should.be.equal(domain_id);
              done();
            })
            .catch( function( err ) {
                done( err );
            });
        };
      };

      xit('should return data for report_type = country', run_( 'country', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = os', run_( 'os', domains.test.name, domains.test.id ) );
      xit('should return data for report_type = device', run_( 'device', domains.test.name, domains.test.id ) );
    });


  });


});

