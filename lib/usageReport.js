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

/*jslint node: true */
'use strict';
//  ----------------------------------------------------------------------------------------------//

var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var utils = require( '../lib/utilities.js' );
var es = require( '../lib/elasticSearch' );

var mongoConnection = require('../lib/mongoConnections');

var DomainConfig = require('../models/DomainConfig');
var Location = require('../models/Location');
var App = require('../models/App');
var APIKey = require('../models/APIKey');
var UsageReport = require('../models/UsageReport');
// var User = require('../models/User');

var locations = new Location(mongoose, mongoConnection.getConnectionPortal());
var domains = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var applications = new App(mongoose, mongoConnection.getConnectionPortal());
var apiKeys = new APIKey(mongoose, mongoConnection.getConnectionPortal());
var reports = new UsageReport(mongoose, mongoConnection.getConnectionPortal());

//  ----------------------------------------------------------------------------------------------//

var dayRegEx_ = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
var parseDay_ = function( day ) {

  if ( dayRegEx_.test( day ) ) {
    return new Date( day );
  }
  day = Date.parse( day );
  if ( !day ) {
    throw new Error( 'usageReport parsing error: wrong date format' );
  }
  return day;
};

//  ---------------------------------
var collectWebTrafficData_ = function( day ) {

  var start = day.getTime();
  start -= start % 86400000/*day_ms*/;
  var end = start + 86400000/*day_ms*/;

  var query = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [{
                range: {
                  '@timestamp': {
                    gte: start,
                    lt: end
                  }
                }
              }]
            }
          }
        }
      },
      aggs: {
        domains: {
          terms: { field: 'domain', size: 0 },
          aggs: {
            hosts: {
              terms: { field: 'host', size: 0 },
              aggs: {
                total_sent: {
                  sum: { field: 's_bytes' }
                },
                total_received: {
                  sum: {field: 'r_bytes' }
                },
                samples: {
                  date_histogram: {
                    field: '@timestamp',
                    interval: '5m',
                    min_doc_count: 1  //  no need to store empty samples to count burstable rate
                  },
                  aggs: {
                    sent: {
                      sum: { field: 's_bytes' }
                    },
                    received: {
                      sum: {field: 'r_bytes' }
                    }
                  }
                }
              }
            },
            cache: {
              terms: { field: 'cache' }
            },
            port: {
              terms: { field: 'ipport' }
            }
          }
        }
      }
    };

  return es.getClient().search( {
      index: utils.buildIndexList( start, end ),
      ignoreUnavailable: true,
      timeout: 120000,
      body: query
    })
    .then( function( resp ) {

      var traff = [];
      if ( resp.aggregations && resp.aggregations.domains.buckets.length ) {
        traff = resp.aggregations.domains.buckets.map( function( domain ) {
          var d_ = {};
          d_.domain = domain.key;
          d_.count = domain.doc_count;
          d_.received_bytes = 0;
          d_.sent_bytes = 0;
          d_.zones = domain.hosts.buckets.map( function( zone ) {
            d_.received_bytes += zone.total_received.value;
            d_.sent_bytes += zone.total_sent.value;
            var billing_samples = {};
            zone.samples.buckets.forEach( function( ival ) {
              billing_samples[ival.key] = {
                count: ival.doc_count,
                received_bytes: ival.received.value,
                sent_bytes: ival.sent.value
              };
            });

            return {
              host: zone.key,
              code: zone.key.slice( 0, ( zone.key.indexOf( '-' ) ) ),
              count: zone.doc_count,
              received_bytes: zone.total_received.value,
              sent_bytes: zone.total_sent.value,
              billing_samples: billing_samples
            };
          });
          d_.ports = {};
          domain.port.buckets.forEach( function( item ) {
            d_.ports[item.key] = item.doc_count;
          });
          d_.cache_hits = { MISS: 0, HIT: 0 };
          domain.cache.buckets.forEach( function( item ) {
            if ( d_.cache_hits[item.key] !== undefined ) {
              d_.cache_hits[item.key] += item.doc_count;
            } else {
              d_.cache_hits.MISS += item.doc_count;
            }
          });
          return d_;
        });
      }

      return traff;
    });
};

//  ---------------------------------
var accumulateSamples_ = function( dest, src ) {
  for ( var key in src ) {
    if ( dest[key] ) {
      dest[key].count += src[key].count;
      dest[key].received_bytes += src[key].received_bytes;
      dest[key].sent_bytes += src[key].sent_bytes;
    } else {
      dest[key] = src[key];
    }
  }
};

//  ---------------------------------
//  assuming two objects with numerical properties, no check
var accumulate_ = function( dest, src ) {
  for ( var key in src ) {
    if ( dest[key] ) {
      dest[key] += src[key];
    } else {
      dest[key] = src[key];
    }
  }
};


//  ----------------------------------------------------------------------------------------------//
module.exports = {};

//  collect usage data for the given day
//  day must be string either in "YYYY-MM-DD" or "-3d" format (but be careful with latter - here're some glitches with UTC/local difference)
//  second param means dry run - no data saving
module.exports.collect = function( day, dry ) {

  return promise.resolve( day )
    .then( parseDay_ )
    .then( function( d ) {
      day = d;
      return promise.all([
        collectWebTrafficData_( day ),
        domains.accountDomainsData(),
        locations.code2BillingZoneMapping(),
        applications.accountAppsData(),
        apiKeys.accountAPIKeysData()
      ]);
    })
    .then( function( responses ) {

      var now = Date.now();
      var totals = {
        report_for_day: day,
        created_at: now,
        account_id: 'TOTALS',
        domains: {},
        applications: {},
        api_keys: {},
        port_hits: {},
        cache_hits: {},
        traffic_total: {
          received_bytes: 0,
          sent_bytes: 0,
          count: 0
        },
        traffic_per_billing_zone: {}
      };

      // return responses;
      var accounts = {};
      responses[0/*web traffic*/].forEach( function( dmn ) {
        var acc_id = responses[1/*account domains*/].domain_to_acc_id_map[dmn.domain];
        if ( !acc_id ) {
          logger.warn( 'account not found for domain ' + dmn.domain + ', skipping' );
          return;
        }
        if ( !accounts[acc_id] ) {
          accounts[acc_id] = {
            report_for_day: day,
            created_at: now,
            account_id: acc_id,
            domains: responses[1/*account domains*/].account_domains_count[acc_id],
            domains_usage: {},
            applications: responses[3/*account apps*/][acc_id],
            api_keys: responses[4/*account api keys*/][acc_id] || /*dbg/fake account*/{ total: 0, inactive: 0, active: 0 },
            traffic_per_billing_zone: {}
          };
        }
        var domain = dmn.domain.replace( /\./g, '+' );
        var acc = accounts[acc_id];
        if ( !acc.domains_usage[domain] ) {
          acc.domains_usage[domain] = {
            traffic_total: {
              received_bytes: dmn.received_bytes,
              sent_bytes: dmn.sent_bytes,
              count: dmn.count
            },
            traffic_per_billing_zone: {},
            ports: dmn.ports,
            cache_hits: dmn.cache_hits
          };
        }

        accumulate_( totals.traffic_total, acc.domains_usage[domain].traffic_total );
        accumulate_( totals.port_hits, dmn.ports );
        accumulate_( totals.cache_hits, dmn.cache_hits );
        accumulate_( totals.domains, acc.domains );
        accumulate_( totals.applications, acc.applications );
        accumulate_( totals.api_keys, acc.api_keys );

        //  domain's traffic grouped by hosts(proxy), the different hosts can belong to one billing zone
        //  so we need an ability to _accumulate_ traffic and samples passed through different proxies

        var account_tpbz = acc.traffic_per_billing_zone;
        var domain_tpbz = acc.domains_usage[domain].traffic_per_billing_zone;

        dmn.zones.map( function( z ) {
          var zone = responses[2/*code to billing zone*/][z.code] || ( 'Unknown(' + z.code + ')' );
          if ( !domain_tpbz[zone] ) {
            domain_tpbz[zone] = z;
          } else {
            domain_tpbz[zone].received_bytes += z.received_bytes;
            domain_tpbz[zone].sent_bytes += z.sent_bytes;
            domain_tpbz[zone].count += z.count;
            accumulateSamples_( domain_tpbz[zone].billing_samples, z.billing_samples );
          }

          if ( !account_tpbz[zone] ) {
            account_tpbz[zone] = z;
          } else {
            account_tpbz[zone].received_bytes += z.received_bytes;
            account_tpbz[zone].sent_bytes += z.sent_bytes;
            account_tpbz[zone].count += z.count;
            accumulateSamples_( account_tpbz[zone].billing_samples, z.billing_samples );
          }

          if ( !totals.traffic_per_billing_zone[zone] ) {
            totals.traffic_per_billing_zone[zone] = z;
          } else {
            totals.traffic_per_billing_zone[zone].received_bytes += z.received_bytes;
            totals.traffic_per_billing_zone[zone].sent_bytes += z.sent_bytes;
            totals.traffic_per_billing_zone[zone].count += z.count;
            accumulateSamples_( totals.traffic_per_billing_zone[zone].billing_samples, z.billing_samples );
          }
        });

      });

      //  decompose hash to array
      var bulk = [totals];
      for( var aid in accounts ) {
        bulk.push( accounts[aid] );
      }
      return dry ? bulk : reports.bulk_upsert( bulk );
    })
    .catch( function( err ) {
      logger.error( err );
    });
};

//  ---------------------------------
//  day must be string either in "YYYY-MM-DD" or "-3d" format (but be careful with latter - here're some glitches with UTC/local difference)
module.exports.getReport = function( day ) {

  return promise.resolve( day )
    .then( parseDay_ )
    .then( function( d ) {
      day = d;
      return reports.list( day, day, false, {domains_usage:0} );
      //  debug
      // return reports.list( day, (new Date()), {accounts:0} );
      //  debug
    })
    .catch( function( err ) {
      logger.error( err );
    });
};
