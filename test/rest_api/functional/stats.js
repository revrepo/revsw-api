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
var dp = require('./../common/providers/statsData');
var DP = new dp();

var should = require('should-http');
// var request = require('supertest-as-promised');
var promise = require('bluebird');
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

        console.log( '  ### testing data - reading' );
        return DP.readTestingData();
      })
      .then( function() {
        if ( Date.now() - DP.options.from > 3600000 * 24 ) {
          console.log( '  ### testing data is more than 24 hrs old, please re-gen\n' );
          return done( new RangeError() );
        }

        // console.log( DP.options );
        console.log( '  ### testing data - ready\n' );
        done();
      })
      .catch( function( err ) {
        done( err );
      });
  });

  after(function (done) {
    done();
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
              var aggs = DP.options.aggs[0].lm_rtt_aggs;

              //  check aggregated avg/min/max/count values
              for ( var i = 0, len = data.length; i < len; ++i ) {
                aggs[type][data[i].key].count.should.be.equal( data[i].count);
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

      //  ---------------------------------
      it('Country aggregations', run_( 'country' ) );
      it('OS aggregations', run_( 'os' ) );
      it('Device aggregations', run_( 'device' ) );
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
              var aggs = DP.options.aggs[0].gbt_aggs;

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

