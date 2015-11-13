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
        }
      }

      it('should return data for report_type = referer', run_( 'referer', domains.test.name, domains.test.id ) );
      it('should return data for report_type = status_code', run_( 'status_code', domains.test.name, domains.test.id ) );
      it('should return data for report_type = cache_status', run_( 'cache_status', domains.test.name, domains.test.id ) );
      it('should return data for report_type = content_type', run_( 'content_type', domains.test.name, domains.test.id ) );
      it('should return data for report_type = protocol', run_( 'protocol', domains.test.name, domains.test.id ) );
      it('should return data for report_type = http_protocol', run_( 'http_protocol', domains.test.name, domains.test.id ) );
      it('should return data for report_type = http_method', run_( 'http_method', domains.test.name, domains.test.id ) );
      it('should return data for report_type = content_encoding', run_( 'content_encoding', domains.test.name, domains.test.id ) );
      it('should return data for report_type = os', run_( 'os', domains.test.name, domains.test.id ) );
      it('should return data for report_type = device', run_( 'device', domains.test.name, domains.test.id ) );
      it('should return data for report_type = country', run_( 'country', domains.test.name, domains.test.id ) );
      it('should return data for report_type = QUIC', run_( 'QUIC', domains.test.name, domains.test.id ) );

    });
  });


});

