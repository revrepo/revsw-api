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

    describe('Smoke: ', function () {

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
        }
      }

      it('should return data without query', run_({}) );
      it('should return data for status_code', run_({ status_code: 200 }) );
      it('should return data for cache_code', run_({ cache_code: 'HIT' }) );
      it('should return data for request_status', run_({ request_status: 'OK' }) );
      it('should return data for protocol', run_({ protocol: 'HTTPS' }) );
      it('should return data for http_method', run_({ http_method: 'GET' }) );
      it('should return data for quic', run_({ quic: 'QUIC' }) );
      it('should return data for country', run_({ country: 'ZU' }) );
      it('should return data for os', run_({ os: 'Windows' }) );
      it('should return data for device', run_({ device: 'Motorola' }) );

    });
  });


});

