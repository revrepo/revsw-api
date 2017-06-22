/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

require('should-http');

var config = require('config');
var API = require('./../../common/api');
var Utils = require('./../../common/utils');
var moment = require('moment');
var dp = require('./../../common/providers/statsData');
var UsageDP = new dp();

//  ----------------------------------------------------------------------------------------------//

describe('UsageReport Functional check:', function () {

  // Changing default mocha's timeout
  this.timeout(config.get('api.request.maxTimeout'));

  var point = '    • ',
    user = config.get('api.users.admin'),
    account_id = config.get('api.usage_report.account_id'),
    domain = config.get('api.usage_report.domain_name'),
    estimated = UsageDP.countEstimations(),
    test_data_timespan = 12 * 3600,
    report;
   // console.log( estimated );
  describe( 'UsageReport Stats ', function ( ) {
      describe( 'Current month', function ( ) {
        var usageReportData;
        var startDate = moment().utc().startOf('M').startOf('d');
        var endDate = moment().utc().endOf('M').endOf('d');
        var currentStartDate = moment().utc().startOf('day');
        var currentEndDate = moment().utc().endOf('day');
        var daysInMonth = endDate.diff(startDate,'days') + 1;// NOTE: count days include last
        var params = {
            from_timestamp: startDate.valueOf(),
            to_timestamp: endDate.valueOf(),
            account_id: account_id
          };
        before(function(done){
              API.helpers
            .authenticateUser(user)
            .then(function () {
              API.resources.usage_report
                .stats()
                .getAll(params)
                .expect(200)
                .then( function( data ) {
                  usageReportData = JSON.parse(data.text);
                  // console.log( JSON.stringify(usageReportData,null,4));
                  done();
                });
            })
            .catch(done);
        });

        it('stats data should contain data for each '+ daysInMonth+' days in month ',function(){
          usageReportData.should.be.ok();
          usageReportData.data.length.should.be.equal(daysInMonth);
        }) ;
      });

     describe( 'Before month', function ( ) {
        var usageReportData;
        var startDate = moment().utc().subtract(1,'M').startOf('M').startOf('d');
        var endDate = moment().utc().subtract(1,'M').endOf('M').endOf('d');
        var daysInMonth = endDate.diff(startDate,'days') + 1;// NOTE: count days include last
        var params = {
          from_timestamp: startDate.valueOf(),
          to_timestamp: endDate.valueOf(),
          account_id: account_id
        };
        before(function(done){
              API.helpers
            .authenticateUser(user)
            .then(function () {
              API.resources.usage_report
                .stats()
                .getAll(params)
                .expect(200)
                .then( function( data ) {
                  usageReportData = JSON.parse(data.text);
                  // console.log( JSON.stringify(usageReportData,null,4));
                  done();
                });
            })
            .catch(done);
        });

        it('stats data should contain data for each '+ daysInMonth+' days in last month ',function(){
          usageReportData.should.be.ok();
          usageReportData.data.length.should.be.equal(daysInMonth);
        }) ;
      });
  });
  //  ---------------------------------
  it( 'UsageReport downloaded successfully', function ( done ) {

    API.helpers
      .authenticateUser(user)
      .then(function () {
        API.resources.usage_report
          .getAll({
            from: ( ( new Date( Date.now() - 172800000 ) ).toISOString().slice(0,10) /*before yesterday*/),
            to: ( ( new Date( Date.now() - 86400000 ) ).toISOString().slice(0,10) /*yesterday inclusive*/),
            account_id: account_id
          })
          .expect(200)
          .then( function( data ) {
            report = data.body.data;
            // console.log( JSON.stringify(report,null,2));
            done();
          });
      })
      .catch(done);
  });

  it( 'UsageReport contains account summary', function () {
    report.should.be.ok();
    var found = false;
    for ( var i = 0, len = report.length; i < len; ++i ) {
      if ( report[i].account_id === account_id + '_SUMMARY' ) {
        found = report[i];
        break;
      }
    }
    report = found;
    report.should.be.ok();
  });

  it( 'UsageReport processed non-zero records', function () {
    report.should.be.ok();
    report.records_processed.should.be.ok();
    // console.log( report.records_processed );
    estimated.total_hits *= report.records_processed;
    estimated.hits.cache_code *= report.records_processed;
    estimated.hits.protocol *= report.records_processed;
    estimated.received_bytes *= report.records_processed;
    estimated.sent_bytes *= report.records_processed;
    test_data_timespan *= report.records_processed;
  });

  it( 'UsageReport contains Mobile Apps data', function () {
    report.should.be.ok();
    report.applications.should.have.property( 'total' );
    report.applications.should.have.property( 'active' );
    report.applications.should.have.property( 'deleted' );
  });

  it( 'UsageReport contains Mobile Apps Per Platforms data', function () {
    report.should.be.ok();
    report.apps_per_platform.should.have.property( 'Windows_Mobile' );
    report.apps_per_platform.should.have.property( 'Android' );
    report.apps_per_platform.should.have.property( 'iOS' );
  });

  it( 'UsageReport contains SSL Certificates data', function () {
    report.should.be.ok();
    report.ssl_certs.should.have.property( 'total' );
    report.ssl_certs.should.have.property( 'active' );
    report.ssl_certs.should.have.property( 'deleted' );
   });

  it( 'UsageReport contains domain(' + domain + ') data', function () {
    report.should.be.ok();
    report.domains_usage.should.have.property( domain );
    report = report.domains_usage[domain];
  });

  it( 'UsageReport contains correct total hits amount', function () {
    report.count.should.be.equal( estimated.total_hits );
  });

  it( 'UsageReport contains correct cache hits amount', function () {
    report.cache_hits.MISS.should.be.equal( estimated.hits.cache_code );
    report.cache_hits.HIT.should.be.equal( estimated.hits.cache_code );
  });

  it( 'UsageReport contains correct port hits amount', function () {
    report.port_hits['80'].should.be.equal( estimated.hits.protocol );
    report.port_hits['443'].should.be.equal( estimated.hits.protocol );
  });

  it( 'UsageReport contains correct traffic values', function () {
    report.received_bytes.should.be.equal( estimated.received_bytes );
    report.sent_bytes.should.be.equal( estimated.sent_bytes );
  });

  it( 'UsageReport contains correct billable bandwidth values', function () {
    report.billable_sent_bps.should.be.approximately( ( estimated.sent_bytes * 8 / test_data_timespan ), 100 );
    report.billable_received_bps.should.be.approximately( ( estimated.received_bytes * 8 / test_data_timespan ), 100 );
  });

});



