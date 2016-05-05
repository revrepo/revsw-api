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

var dp = require('./../../common/providers/statsData');
var UsageDP = new dp();

//  ----------------------------------------------------------------------------------------------//

describe('UsageReport Functional check:', function () {

  // Changing default mocha's timeout
  this.timeout(config.get('api.request.maxTimeout'));

  var point = '    • ',
    user = config.get('api.usage_report.user'),
    account_id = config.get('api.usage_report.account_id'),
    domain = config.get('api.usage_report.domain_name'),
    ystrdy = ( new Date( Date.now() - 86400000 ) ).toISOString().slice(0,10),
    estimated = UsageDP.countEstimations(),
    test_data_timespan = 12 * 3600,
    report;
    // console.log( estimated );

  //  ---------------------------------
  it( 'UsageReport downloaded successfully', function ( done ) {

    API.helpers
      .authenticateUser(user)
      .then(function () {
        API.resources.usage_report
          .getAll({
            from: ystrdy,
            to: ystrdy,
            account_id: account_id
          })
          .expect(200)
          .then( function( data ) {
            report = data.body.data;
            // console.log( report );
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
    };
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



