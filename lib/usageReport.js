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

var _ = require('lodash');
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

var SAMPLE_LEN_SEC = 300; //  5 min in seconds, kinda const
var dayRegEx_ = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
var parseDay_ = function( day ) {

  if ( dayRegEx_.test( day ) ) {
    return new Date( day );
  }
  day = Date.parse( day );
  if ( !day ) {
    throw new Error( 'usageReport parsing error: wrong date format' );
  }
  day.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
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

//  ---------------------------------
//  dest/src - billing_samples
var accumulateSamples_ = function( dest, src ) {
  for ( var time in src ) {
    if ( dest[time] ) {
      dest[time].count += src[time].count;
      dest[time].received_bytes += src[time].received_bytes;
      dest[time].sent_bytes += src[time].sent_bytes;
    } else {
      dest[time] = src[time];
    }
  }
};

//  ---------------------------------
//  dest/src - traffic_per_billing_zone, returns total traffic counts(w/o samples)
var accumulateTPBZ_ = function( dest, src, skip_samples ) {

  var totals = {
    count: 0,
    received_bytes: 0,
    sent_bytes: 0
  };
  for ( var zone in src ) {
    if ( !dest[zone] ) {
      dest[zone] = {
        count: 0,
        received_bytes: 0,
        sent_bytes: 0
      };
      if ( !skip_samples ) {
        dest[zone].billing_samples = {};
      }
    }
    dest[zone].count += src[zone].count;
    dest[zone].received_bytes += src[zone].received_bytes;
    dest[zone].sent_bytes += src[zone].sent_bytes;
    if ( !skip_samples ) {
      accumulateSamples_( dest[zone].billing_samples, src[zone].billing_samples );
    }
    totals.count += src[zone].count;
    totals.received_bytes += src[zone].received_bytes;
    totals.sent_bytes += src[zone].sent_bytes;
  }
  return totals;
};

//  ---------------------------------
//  count 95percentile from the traffic/billing samples
//  billing_samples: {
//      '1456185600000': {
//          count: 10,
//          received_bytes: 1570,
//          sent_bytes: 6409
//      }, ...
//  }
var count95p_ = function( billing_samples, period_days ) {
  var res = {
    billable_received_bps: 0,
    billable_sent_bps: 0
  };
  //  5% of total qty of 5min intervals
  var q5 = Math.floor( period_days * 24 * 3600 / SAMPLE_LEN_SEC / 20 );

  console.log( 'q5 ' + q5 );

  //  if samples amount less then 5% of total qty of 5min intervals - here's nothing to do
  if ( _.size( billing_samples ) < q5 ) {
    console.log( '_.size( billing_samples ) ' + _.size( billing_samples ) );
    return res;
  }

  var samples = [];
  for ( var s in billing_samples ) {
    var sample = billing_samples[s];
    sample.received_bps = sample.received_bytes / SAMPLE_LEN_SEC;
    sample.sent_bps = sample.sent_bytes / SAMPLE_LEN_SEC;
    samples.push( sample );
  }
  //  sort by received BPS in desc order
  samples.sort( function( lhs, rhs ) {
    return rhs.received_bps - lhs.received_bps;
  });
  res.billable_received_bps = samples[q5].received_bps;
  //  sort by sent BPS in desc order
  samples.sort( function( lhs, rhs ) {
    return rhs.sent_bps - lhs.sent_bps;
  });
  res.billable_sent_bps = samples[q5].sent_bps;
  return res;
};

//  ---------------------------------
//  count 95percentile for all billing zones
//  tpbz - traffic_per_billing_zone
var count95BZ_ = function( tpbz, period_days ) {
  for ( var z in tpbz ) {
    var zone = tpbz[z];
    var c95p = count95p_( zone.billing_samples, period_days );
    zone.billable_received_bps = c95p.billable_received_bps;
    zone.billable_sent_bps = c95p.billable_sent_bps;
  }
};


//  ---------------------------------
//  to sum all traffic in one record, no domain grouping
//  src - accounts array received from mongo

//   domains_usage: {
//       'delete-me-CDS-QA-name-1456185454814+revsw+net': {
//           traffic_per_billing_zone: {
//               'Unknown(TESTSJC20)': {
//                   host: 'TESTSJC20-BP01.REVSW.NET',
//                   code: 'TESTSJC20',
//                   count: 10,
//                   received_bytes: 1570,
//                   sent_bytes: 6409,
//                   billing_samples: {
//                       '1456185600000': {
//                           count: 10,
//                           received_bytes: 1570,
//                           sent_bytes: 6409
//                       }, ...
//                   }
//               }
//           },
//           ports: { '80': 6 },
//           cache_hits: { MISS: 6, HIT: 0 }
//       }
//   }
//

// to:
//   ...
//   count: TTT,
//   received_bytes: UUU,
//   sent_bytes: VVV,
//   traffic_per_billing_zone: {
//       'Unknown(TESTSJC20)': { ....
//   },
//   ports: { '80': XXX, '443': WWW },
//   cache_hits: { MISS: YYY, HIT: ZZZ }
//   ...

var sumAccounts_ = function( accounts, extended ) {

  var res = {
    account_id: 'ACCOUNTS_SUMMARY',
    applications: {},
    api_keys: {},
    domains: {},
    traffic_per_billing_zone: {},
    port_hits: {},
    cache_hits: {}
  };
  accounts.forEach( function( acc ) {
    for ( var d in acc.domains_usage ) {
      var dmn = acc.domains_usage[d];
      accumulate_( res,
        accumulateTPBZ_( res.traffic_per_billing_zone, dmn.traffic_per_billing_zone, !extended/*skip samples*/ ) );
      accumulate_( res.port_hits, dmn.port_hits );
      accumulate_( res.cache_hits, dmn.cache_hits );
    }
    accumulate_( res.applications, acc.applications );
    accumulate_( res.api_keys, acc.api_keys );
    accumulate_( res.domains, acc.domains );
  });

  return res;
};

//  ---------------------------------
var removeSamples_ = function( accounts ) {

  accounts.forEach( function( acc ) {

    var bz;
    for ( var d in acc.domains_usage ) {
      var dmn = acc.domains_usage[d];
      for ( bz in dmn.traffic_per_billing_zone ) {
        dmn.traffic_per_billing_zone[bz].billing_samples = null;
      }
    }
    for ( bz in acc.traffic_per_billing_zone ) {
      acc.traffic_per_billing_zone[bz].billing_samples = null;
    }

  });
};

//  ----------------------------------------------------------------------------------------------//
module.exports = {};

//  collect usage data for the given day
//  day must be string either in "YYYY-MM-DD" or "-3d" format (but be careful with latter - here're some glitches with UTC/local difference)
//  second param means dry run - no data saving
module.exports.collectDayReport = function( day, dry ) {

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

      var now = new Date();

      // return responses;
      var accounts = {};
      responses[0/*web traffic*/].forEach( function( domain_data ) {
        var acc_id = responses[1/*account domains*/].domain_to_acc_id_map[domain_data.domain];
        if ( !acc_id ) {
          logger.warn( 'account not found for domain ' + domain_data.domain + ', skipping' );
          return;
        }
        if ( !accounts[acc_id] ) {
          accounts[acc_id] = {
            report_for_day: day,
            created_at: now,
            account_id: acc_id,
            applications: responses[3/*account apps*/][acc_id],
            api_keys: responses[4/*account api keys*/][acc_id] || /*dbg/fake account*/{ total: 0, inactive: 0, active: 0 },
            domains: responses[1/*account domains*/].account_domains_count[acc_id],
            domains_usage: {}
          };
        }
        //  field name in Mongo may not contain points
        var domain = domain_data.domain.replace( /\./g, '+' );
        var acc = accounts[acc_id];
        if ( !acc.domains_usage[domain] ) {
          acc.domains_usage[domain] = {
            traffic_per_billing_zone: {},
            port_hits: domain_data.ports,
            cache_hits: domain_data.cache_hits
          };
        }

        //  domain's traffic grouped by hosts(proxies), the different hosts can belong to one billing zone
        //  so we need an ability to _accumulate_ traffic and samples passed through different proxies

        var domain_tpbz = acc.domains_usage[domain].traffic_per_billing_zone;
        domain_data.zones.map( function( z ) {

          var zone = responses[2/*code to billing zone*/][z.code] || ( 'Unknown(' + z.code + ')' );

          if ( !domain_tpbz[zone] ) {
            domain_tpbz[zone] = z;
          } else {
            domain_tpbz[zone].received_bytes += z.received_bytes;
            domain_tpbz[zone].sent_bytes += z.sent_bytes;
            domain_tpbz[zone].count += z.count;
            accumulateSamples_( domain_tpbz[zone].billing_samples, z.billing_samples );
          }
        });

      });

      //  decompose hash to array
      var bulk = [];
      for( var aid in accounts ) {
        bulk.push( accounts[aid] );
      }

      //  build day totals
      var totals = sumAccounts_( bulk, true/*extended - with samples*/ );
      totals.report_for_day = day;
      totals.created_at = now;
      totals.account_id = 'TOTALS';
      bulk.push( totals );

      return dry ? bulk : reports.bulk_upsert( bulk );
    })
    .catch( function( err ) {
      logger.error( err );
    });
};

//  result will be:

// {
//   report_for_day: Tue Feb 23 2016 04: 00: 00 GMT + 0400(SAMT),
//   created_at: Thu Feb 25 2016 00: 47: 04 GMT + 0400(SAMT),
//   account_id: '123456789012345678901234',
//   domains: {
//       total: 2,
//       deleted: 1,
//       active: 1,
//       ssl_enabled: 2
//   },
//   applications: {
//       total: 625,
//       deleted: 625,
//       active: 0
//   },
//   api_keys: {
//       total: 0,
//       inactive: 0,
//       active: 0
//   },
//   domains_usage: {
//       'delete-me-CDS-QA-name-1456185454814+revsw+net': {
//           traffic_per_billing_zone: {
//               'Unknown(TESTSJC20)': {
//                   host: 'TESTSJC20-BP01.REVSW.NET',
//                   code: 'TESTSJC20',
//                   count: 10,
//                   received_bytes: 1570,
//                   sent_bytes: 6409,
//                   billing_samples: {
//                       '1456185600000': {
//                           count: 10,
//                           received_bytes: 1570,
//                           sent_bytes: 6409
//                       }, ....
//                   }
//               }, ....
//           },
//           port_hits: { '80': 6 },
//           cache_hits: { MISS: 6, HIT: 0 }
//       }, ....
//   }
// }

//  totals

// {
//   report_for_day: Tue Feb 23 2016 04: 00: 00 GMT + 0400(SAMT),
//   created_at: Thu Feb 25 2016 00: 47: 04 GMT + 0400(SAMT),
//   account_id: 'TOTALS',
//   domains: {
//       total: 2,
//       deleted: 1,
//       active: 1,
//       ssl_enabled: 2
//   },
//   applications: {
//       total: 625,
//       deleted: 625,
//       active: 0
//   },
//   api_keys: {
//       total: 0,
//       inactive: 0,
//       active: 0
//   },
//   traffic_per_billing_zone: {
//       'Unknown(TESTSJC20)': {
//           count: 10,
//           received_bytes: 1570,
//           sent_bytes: 6409,
//           billing_samples: {
//               '1456185600000': {
//                   count: 10,
//                   received_bytes: 1570,
//                   sent_bytes: 6409
//               }, ....
//           }
//       }, ....
//   },
//   ports: { '80': 6 },
//   cache_hits: { MISS: 6, HIT: 0 }
// }

//  ---------------------------------
//  load saved reports stored in the DB
//  from/to represent inclusive date interval, accurate to day
//    they must be strings either in "YYYY-MM-DD" or "-3d" format or just Date
//  aids stands for accoint ID(s), can be neither ID, an array of IDs or false/nothing for any
//    if you need totals put 'TOTALS' there
//  extended - return data with 5min samples
//  count95p - measure bandwidth with 95% usage
module.exports.loadReports = function( from, to, aids, extended, count95p ) {

  from = parseDay_( from );
  to = parseDay_( to );

  return reports.list( from, to, aids )
    .then( function( reports ) {
      var s = sumAccounts_( reports, ( extended || count95p ) );
      if ( count95p ) {
        var days = Math.floor( to.getTime() / 86400000 ) - Math.floor( from.getTime() / 86400000 ) + 1/*inclusive*/;
        count95BZ_( s.traffic_per_billing_zone, days );
      }
      reports.push( s );
      if ( !extended ) {
        removeSamples_( reports );
      }
      return reports;
    })
    .catch( function( err ) {
      logger.error( err );
    });
};

