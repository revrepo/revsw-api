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

      var tests;
      before(function (done) {
        tests = DP.generateLMRTTTests();
        done();
      });

      var run_ = function( type ) {

        return function( done ) {
          API.resources.stats.stats_lastmile_rtt
            .getOne(domains.google.id)
            .query(tests[type].query)
            .expect( 200 )
            .then( function( res ) {
              var data = JSON.parse( res.text );

              //  common data equality
              tests[type].total_hits.should.be.equal( data.metadata.total_hits );
              tests[type].data_points_count.should.be.equal( data.metadata.data_points_count );

              data = data.data;
              //  check aggregated avg/min/max/count values
              for ( var i = 0, len = data.length; i < len; ++i ) {
                var item = tests[type].data[data[i].key];

                item.count.should.be.equal( data[i].count);
                item.lm_rtt_avg_ms.should.be.equal( data[i].lm_rtt_avg_ms );
                item.lm_rtt_max_ms.should.be.equal( data[i].lm_rtt_max_ms );
                item.lm_rtt_min_ms.should.be.equal( data[i].lm_rtt_min_ms );
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

      var tests;
      before(function (done) {
        tests = DP.generateGBTTests();
        done();
      });

      var run_ = function( type ) {

        return function( done ) {
          API.resources.stats.stats_gbt
            .getOne(domains.google.id)
            .query(tests[type].query)
            .expect( 200 )
            .then( function( res ) {
              var data = JSON.parse( res.text );

              //  common data equality
              tests[type].total_hits.should.be.equal( data.metadata.total_hits );
              tests[type].data_points_count.should.be.equal( data.metadata.data_points_count );

              data = data.data;
              //  check aggregated avg/min/max/count values
              for ( var i = 0, len = data.length; i < len; ++i ) {
                var item = tests[type].data[data[i].key];

                item.count.should.be.equal( data[i].count );
                item.sent_bytes.should.be.equal( data[i].sent_bytes );
                item.received_bytes.should.be.equal( data[i].received_bytes );
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

    describe('Top Objects requests: ', function () {

      var to_tests = [];
      this.timeout( config.api.request.maxTimeout * 128 );

      before( function () {
        console.log( '      ### top opjects testing run:' );
        to_tests = DP.generateTopObjectsTests();
      });

      it( 'All requests combinations', function( done ) {

        var run_ = function( test ) {
          console.log( '        + ' + test.name );
          return API.resources.stats.stats_top_objects
            .getOne(domains.google.id)
            .query(test.query)
            // .expect( 200 )
            .then( function( res ) {
              var data = JSON.parse( res.text );
              test.count.should.be.equal( data.metadata.total_hits );
            })
            .catch( function( e ) {
              if ( e.response && e.response.error ) {
                console.log( '  ERROR: ', e.response.error );
              }
              console.log( '  ERROR, query: ', test.query );
              throw e;
            });
        };

        promise.map( to_tests, run_, { concurrency: 32 } )
          .then( function() {
            done();
          })
          .catch( function( e ) {
            done( e );
          });
      });
    });

    describe('Top requests: ', function () {

      var to_tests = [];
      this.timeout( config.api.request.maxTimeout * 12 );

      before( function () {
        console.log( '      ### top testing run:' );
        to_tests = DP.generateTopTests();
      });

      it( 'All requests combinations', function( done ) {

        var run_ = function( test ) {

          console.log( '        + ' + test.name );

          return API.resources.stats.stats_top
            .getOne(domains.google.id)
            .query(test.query)
            // .expect( 200 )
            .then( function( res ) {
              var data = JSON.parse( res.text );

              test.total_hits.should.be.equal( data.metadata.total_hits );
              test.data_points_count.should.be.equal( data.metadata.data_points_count );

              if ( test.count ) {
                data = data.data;
                for ( var i = 0, len = data.length; i < len; ++i ) {
                  test.count.should.be.equal( data[i].count );
                }
              }
            })
            .catch( function( e ) {
              if ( e.response && e.response.error ) {
                console.log( '  ERROR: ', e.response.error );
              }
              console.log( '  ERROR, query: ', test.query );
              throw e;
            });
        };

        promise.map( to_tests, run_, { concurrency: 24 } )
          .then( function() {
            done();
          })
          .catch( function( e ) {
            done( e );
          });
      });
    });

  });
});

