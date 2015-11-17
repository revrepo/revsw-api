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

// Requiring common components to use in our spec/test.
var API = require('./../common/api');
var DP = require('./../common/providers/statsData');

var should = require('should-http');
// var request = require('supertest-as-promised');
var config = require('config');

var justtaUser = config.api.users.user;
var domains = config.api.stats.domains;

//  ----------------------------------------------------------------------------------------------//
//  suite
describe('Stats API check:', function () {

  this.timeout(config.api.request.maxTimeout);

  //  ---------------------------------
  before(function (done) {
    return API.resources.authenticate
      .createOne({ email: justtaUser.name, password: justtaUser.password })
      .then(function(response) {
        justtaUser.token = response.body.token;
        API.session.setCurrentUser(justtaUser);

        console.log( '  ### testing data - pre-clearing' );
        return DP.killTestingData();
      })
      .then( function() {
        console.log( '  ### testing data - reading' );
        return DP.readTestingData();
      })
      .then( function() {
        console.log( '  ### testing data - uploading' );
        return DP.uploadTestingData();
      })
      .then( function() {
        console.log( '  ### testing data - ready\n' );
        done();
      })
      .catch( function( err ) {
        done( err );
      });
  });

  after(function (done) {
    DP.clearTestingData()
      .then( function() {
        console.log( '\n  ### testing data - cleared' );
        done();
      })
      .catch( function( err ) {
        done( err );
      });
  });

  //  ---------------------------------
  describe('Functional/Aggregations: ', function () {

    describe('Lastmile RTT requests: ', function () {

      var run_ = function( type ) {

        return function( done ) {
          API.resources.stats.stats_lastmile_rtt
            .getOne(domains.google.id)
            .query({ from_timestamp: DP.options.from, to_timestamp: DP.options.to, report_type: type })
            .expect( 200 )
            .then( function( res ) {
              var data = JSON.parse( res.text );
              //  common data equality
              DP.options.dataCount.should.be.equal( data.metadata.total_hits );
              domains.google.name.should.be.equal( data.metadata.domain_name );

              data = data.data;
              var aggs = DP.options.lm_rtt_aggs;

              //  check aggregated avg/min/max/count values
              for ( var i = 0, len = data.length; i < len; ++i ) {
                aggs[type][data[i].key].count.should.be.equal( data[i].count );
                aggs[type][data[i].key].lm_rtt_avg_ms.should.be.equal( data[i].lm_rtt_avg_ms );
                aggs[type][data[i].key].lm_rtt_max_ms.should.be.equal( data[i].lm_rtt_max_ms );
                aggs[type][data[i].key].lm_rtt_min_ms.should.be.equal( data[i].lm_rtt_min_ms );
              }
              done();
            })
            .catch( function( err ) {
              done( err );
            });
        };
      };

      it('Country aggregation', run_( 'country' ) );
      it('OS aggregation', run_( 'os' ) );
      it('Device aggregation', run_( 'device' ) );

    });

    describe('GBT/Traffic requests: ', function () {

      var run_ = function( type ) {

        return function( done ) {
          API.resources.stats.stats_gbt
            .getOne(domains.google.id)
            .query({ from_timestamp: DP.options.from, to_timestamp: DP.options.to, report_type: type })
            .expect( 200 )
            .then( function( res ) {
              var data = JSON.parse( res.text );
              //  common data equality
              DP.options.dataCount.should.be.equal( data.metadata.total_hits );
              domains.google.name.should.be.equal( data.metadata.domain_name );

              data = data.data;
              var aggs = DP.options.gbt_aggs;

              //  check aggregated avg/min/max/count values
              for ( var i = 0, len = data.length; i < len; ++i ) {
                aggs[type][data[i].key].count.should.be.equal( data[i].count );
                aggs[type][data[i].key].sent_bytes.should.be.equal( data[i].sent_bytes );
                aggs[type][data[i].key].received_bytes.should.be.equal( data[i].received_bytes );
              }
              done();
            })
            .catch( function( err ) {
              done( err );
            });
        };
      };

      it('Country aggregation', run_( 'country' ) );
      it('OS aggregation', run_( 'os' ) );
      it('Device aggregation', run_( 'device' ) );

    });

  });


});

