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
var mail = require('../lib/mail');

var mongoConnection = require('../lib/mongoConnections');

var DomainConfig = require('../models/DomainConfig');
var Location = require('../models/Location');
var App = require('../models/App');
var APIKey = require('../models/APIKey');
var UsageReport = require('../models/UsageReport');
var Account = require('../models/Account');
var User = require('../models/User');
var SSLName = require('../models/SSLName');

var locationsModel = new Location(mongoose, mongoConnection.getConnectionPortal());
var domainsModel = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var applicationsModel = new App(mongoose, mongoConnection.getConnectionPortal());
var apiKeysModel = new APIKey(mongoose, mongoConnection.getConnectionPortal());
var reportsModel = new UsageReport(mongoose, mongoConnection.getConnectionPortal());
var accountsModel = new Account(mongoose, mongoConnection.getConnectionPortal());
var usersModel = new User(mongoose, mongoConnection.getConnectionPortal());
var sslNameModel = new SSLName(mongoose, mongoConnection.getConnectionPortal());

//  ----------------------------------------------------------------------------------------------//

var root_ = ( function () {
  //  looks like it's ancient mammoth shit, [this] perfectly defined even in strict/v0.10, but let it be
  var indirectEval = ( 0, eval );
  return this || indirectEval( 'this' );
}() );
//  forcibly run garbage collection if GC is exposed by --expose-gc
var runGC_ = function () {
  if ( root_.gc ) {
    root_.gc();
  }
};

//  ---------------------------------
var SAMPLE_LEN_SEC = 300; //  5 min in seconds, kinda const
var dayRegEx_ = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
var parseDay_ = function( day ) {

  if ( _.isDate( day ) ) {
    day.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
    return day;
  }
  if ( dayRegEx_.test( day ) ) {
    return new Date( day );
  }
  var parsed = Date.parse( day );
  if ( !parsed ) {
    throw new Error( 'usageReport parsing error: wrong date format - ' + day );
  }
  parsed.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
  return parsed;
};

/** *********************************
 *  query web traffic data from the ES cluster
 */
var collectWebTrafficData_ = function( day, domains ) {

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

  if ( domains && domains.length ) {
    query.query.filtered.filter.bool.must.push({
      terms: { domain: domains }
    });
  }

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
            var billingSamples = {};
            zone.samples.buckets.forEach( function( ival ) {
              billingSamples[ival.key] = {
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
              billing_samples: billingSamples
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

/** *********************************
 *  BASE functionality of the code
 *  sum up numeric props, going down recursively into plain objects, ignore everything else
 *
 *  @param {object} - destination object
 *  @param {object} - source object
 *  @param {object} - object of the form { prop_name: 1, other_prop_name: 1 }, optional
 */
var accumulate_ = function( dest, src, ignore ) {
  for ( var key in src ) {
    if ( ignore && ignore[key] ) {
      continue;
    }
    if ( _.isNumber( src[key] ) ) {
      if ( dest[key] ) {
        dest[key] += src[key];
      } else {
        dest[key] = src[key];
      }
    } else if ( _.isPlainObject( src[key] ) ) {
      if ( !dest[key] ) {
        dest[key] = {};
      }
      accumulate_( dest[key], src[key], ignore );
    }
  }
};

/** *********************************
 *  count 95percentile from the traffic/billing samples
 *
 *  @param {object} - billing samples, {
 *      '1456185600000': {
 *          count: 10,
 *          received_bytes: 1570,
 *          sent_bytes: 6409
 *      }, ...
 *  }
 *  @param {integer} - number of days
 */
var count95p_ = function( billingSamples, periodDays ) {
  var res = {
    billable_received_bps: 0,
    billable_sent_bps: 0
  };
  //  5% of total qty of 5min intervals
  var q5 = Math.floor( periodDays * 24 * 3600 / SAMPLE_LEN_SEC / 20 );

  //  if samples amount less then 5% of total qty of 5min intervals - here's nothing to do
  if ( _.size( billingSamples ) <= q5 ) {
    logger.warn( 'usageReport.js:count95p_, samples amount ' + _.size( billingSamples ) + ' is less or equal to p95 threshold, too few' );
    return res;
  }

  var samples = [];
  for ( var s in billingSamples ) {
    var sample = billingSamples[s];
    sample.received_bps = sample.received_bytes / SAMPLE_LEN_SEC * 8/*BITS! per second*/;
    sample.sent_bps = sample.sent_bytes / SAMPLE_LEN_SEC * 8/*BITS! per second*/;
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

/** *********************************
 *  count 95percentile for all billing zones
 */
var count95BZ_ = function( trafficPerBillingZone, periodDays ) {
  for ( var z in trafficPerBillingZone ) {
    var zone = trafficPerBillingZone[z];
    _.extend( zone, count95p_( zone.billing_samples, periodDays ) );
  }
};

/** *********************************
 *  to sum traffic in one record
 *
 *  @param {[{},{}]} - records array received from mongo or collected for day report
 *  @param {string} - account_id, string value means account's summary,
 *    falsy value means overall summary (no domains grouping)
 *
 *  records[n].domains_usage: {
 *       'cdn.example.com': {
 *           traffic_per_billing_zone: {
 *               'North America': {
 *                   count: 000,
 *                   received_bytes: 000,
 *                   sent_bytes: 000,
 *                   billing_samples: {
 *                       '1456185600000': {
 *                           count: 000,
 *                           received_bytes: 000,
 *                           sent_bytes: 000
 *                       }, ...
 *                   }
 *               }
 *           },
 *           ports: { '80': 000 },
 *           cache_hits: { MISS: 000, HIT: 000 }
 *       }
 *   }
 *
 * @returns {object} {
 *   account_id: 000000000000000000000000_SUMMARY,
 *   records_processed: 000,
 *   applications: { total: 000, deleted: 000, active: 000 },
 *   api_keys: { total: 000, inactive: 000, active: 000 },
 *   domains: { total: 000, deleted: 000, active: 000, ssl_enabled: 000 },
 *   traffic {
 *     count: 000,
 *     received_bytes: 000,
 *     sent_bytes: 000,
 *     billing_samples: { ....
 *   },
 *   traffic_per_billing_zone: {
 *       'North America': { ....
 *   },
 *   ports: { '80': 000, '443': 000 },
 *   cache_hits: { MISS: 000, HIT: 000 }
 * }
 */
var sumAccounts_ = function( records, accountID ) {

  var res = {
    account_id: ( accountID ? accountID + '_SUMMARY' : 'OVERALL_SUMMARY' ),
    records_processed: 0,
    applications: { total: 0, deleted: 0, active: 0 },
    api_keys: { total: 0, inactive: 0, active: 0 },
    domains: { total: 0, deleted: 0, active: 0, ssl_enabled: 0 },
    traffic: { count: 0, received_bytes: 0, sent_bytes: 0 },
    traffic_per_billing_zone: {},
    port_hits: { '80': 0, '443': 0 },
    cache_hits: { HIT: 0, MISS: 0 }
  }, i, j;

  //  to sum domains, applications and api_keys we need to take only last record for every account
  var lastsForAcc = {};

  //  non-falsy accountID, collect domain traffic
  if ( accountID ) {
    res.domains_usage = {};
  }

  records.forEach( function( acc ) {

    for ( var i in acc.domains_usage ) {
      var dmn = acc.domains_usage[i];
      accumulate_( res.traffic_per_billing_zone, dmn.traffic_per_billing_zone );
      accumulate_( res.port_hits, dmn.port_hits );
      accumulate_( res.cache_hits, dmn.cache_hits );
    }
    //  non-falsy accountID, collect domain traffic
    if ( accountID ) {
      accumulate_( res.domains_usage, acc.domains_usage );
    }

    //  clunky a bit
    if ( !lastsForAcc[acc.account_id] || lastsForAcc[acc.account_id].report_for_day < acc.report_for_day ) {
      lastsForAcc[acc.account_id] = acc;
    }

    if ( acc.records_processed ) {
      res.records_processed += acc.records_processed;
    }
  });

  //  total traffic
  for ( i in res.traffic_per_billing_zone ) {
    accumulate_( res.traffic, res.traffic_per_billing_zone[i] );
  }

  //  traffic per domain
  for ( i in res.domains_usage ) {
    var dmn = res.domains_usage[i];
    for ( j in dmn.traffic_per_billing_zone ) {
      accumulate_( dmn, dmn.traffic_per_billing_zone[j] );
    }
  }

  for ( var id in lastsForAcc ) {
    accumulate_( res.domains, lastsForAcc[id].domains );
    accumulate_( res.applications, lastsForAcc[id].applications );
    accumulate_( res.api_keys, lastsForAcc[id].api_keys );
  }
  if ( !res.records_processed ) {
    res.records_processed = records.length;
  }

  return res;
};

//  ---------------------------------
/** *********************************
 *  description
 *
 *  @param {}
 *  @param {}
 *  @param {integer}
 *  @param {bool}
 *  @returns {[]}
 */
var sumOverall_ = function( records, accounts, days, keepSamples ) {

  // sum up data for every account
  var summaries = [];
  var id,
    rf = function( acc ) {
      return acc.account_id === id;
    };
  for ( id in accounts ) {
    var filtered = records.filter( rf );
    if ( filtered.length ) {
      summaries.push( sumAccounts_( filtered, id ) );
    }
  }

  //  empty report
  if ( !summaries.length ) {
    var akeys = Object.keys( accounts );
    summaries.push({
      account_id: ( akeys.length === 1 ? akeys[0] + '_SUMMARY' : 'OVERALL_SUMMARY' ),
      records_processed: 0,
      applications: { total: 0, deleted: 0, active: 0 },
      api_keys: { total: 0, inactive: 0, active: 0 },
      domains: { total: 0, deleted: 0, active: 0, ssl_enabled: 0 },
      traffic: { count: 0, received_bytes: 0, sent_bytes: 0 },
      traffic_per_billing_zone: {},
      port_hits: { '80': 0, '443': 0 },
      cache_hits: { HIT: 0, MISS: 0 }
    });
    return summaries;
  }

  //  overall
  var overall = false;
  if ( summaries.length > 1 ) {
    overall = {
      account_id: 'OVERALL_SUMMARY',
      accounts: []
    };
    summaries.forEach( function( acc ) {
      accumulate_( overall, acc, { domains_usage: 1, traffic_per_billing_zone: 1 /*props to skip*/} );
    });
  }

  //  billing
  summaries.forEach( function( acc ) {

    count95BZ_( acc.traffic_per_billing_zone, days );
    for( var d in acc.domains_usage ) {
      count95BZ_( acc.domains_usage[d].traffic_per_billing_zone, days );
      _.extend( acc.domains_usage[d], count95p_( acc.domains_usage[d].billing_samples, days ) );
    }
    _.extend( acc.traffic, count95p_( acc.traffic.billing_samples, days ) );

    //  remove samples
    if ( !keepSamples ) {
      var bz;
      for ( d in acc.domains_usage ) {
        var dmn = acc.domains_usage[d];
        for ( bz in dmn.traffic_per_billing_zone ) {
          dmn.traffic_per_billing_zone[bz].billing_samples = null;
        }
        dmn.billing_samples = null;
      }
      for ( bz in acc.traffic_per_billing_zone ) {
        acc.traffic_per_billing_zone[bz].billing_samples = null;
      }
      acc.traffic.billing_samples = null;
    }
  });

  //  overall again
  if ( overall ) {
    _.extend( overall.traffic, count95p_( overall.traffic.billing_samples, days ) );

    //  remove samples
    if ( !keepSamples ) {
      overall.traffic.billing_samples = null;
    }
    //  collect base account data
    var toFind_ = function( s ) {
      return s.account_id === id + '_SUMMARY';
    };
    for ( id in accounts ) {
      //  v0.10 doesn't support the native Array.find
      var found = _.find( summaries, toFind_ );
      if ( found ) {
        overall.accounts.push( _.extend({
          acc_id: id,
          acc_name: accounts[id],
          active_domains: found.domains.active,
          active_apps: found.applications.active,
          active_api_keys: found.api_keys.active
        }, found.traffic ) );
      } else {
        overall.accounts.push({
          acc_id: id,
          acc_name: accounts[id],
          active_domains: 0,
          active_apps: 0,
          active_api_keys: 0,
          count: 0,
          received_bytes: 0,
          sent_bytes: 0,
          billable_received_bps: 0,
          billable_sent_bps: 0
        });
      }
    }
    //  sort first by hits then by name
    overall.accounts.sort( function( lhs, rhs ) {
      return ( lhs.count !== rhs.count ? rhs.count - lhs.count : lhs.acc_name.localeCompare( rhs.acc_name ) );
    });
    summaries.push( overall );
  }

  return summaries;
};

//  ---------------------------------
var genEmptyAccount_ = function( day, created, accountID ) {
  return {
    report_for_day: day,
    created_at: created,
    account_id: accountID,
    applications: { total: 0, deleted: 0, active: 0 },
    api_keys: { total: 0, inactive: 0, active: 0 },
    domains: { total: 0, deleted: 0, active: 0, ssl_enabled: 0 },
    domains_usage: {}
  };
};

/** *********************************
 *  debug utility to shallow check/log data integrity
 *
 *  @param {}
 */
var checkTotalsIntegrity_ = function( totals ) {
  var totalPortHits = 0;
  for ( var h in totals.port_hits ) {
    totalPortHits += totals.port_hits[h];
  }
  var totalCacheHits = 0;
  for ( h in totals.cache_hits ) {
    totalCacheHits += totals.cache_hits[h];
  }
  if ( totals.traffic.count !== totalCacheHits || totals.traffic.count !== totalPortHits ) {
    logger.error( 'usageReport.js:checkTotalsIntegrity_, summed up data inconsistence, traffic total hits: ' + totals.traffic.count +
      ', port total hits: ' + totalPortHits + ', cache total hits: ' + totalCacheHits );
  }
  if ( _.size( totals.traffic.billing_samples ) > ( 86400 / SAMPLE_LEN_SEC ) ) {
    logger.error( 'usageReport.js:checkTotalsIntegrity_, summed up data inconsistence, too big total samples amount: ' + _.size( totals.traffic.billing_samples ) );
  }
};


/** *********************************
 *  query active domains list from the DB, including aliases
 *
 *  @returns {promise({domains: array[string], whildcards:[string])}
 */
var collectDomains_ = function() {

  return domainsModel.queryP({},{
      _id:0,
      domain_name:1,
      'proxy_config.domain_aliases':1,
      'proxy_config.domain_wildcard_alias':1
    })
    .then( function( data ) {
      var domains = {};
      var wildcards = [];
      data.forEach( function( d ) {
        domains[d.domain_name] = 1;
        if ( !d.proxy_config ) {
          return;
        }
        if ( d.proxy_config.domain_aliases && d.proxy_config.domain_aliases.length ) {
          d.proxy_config.domain_aliases.forEach( function( item ) {
            domains[item] = 1;
          });
        }
        if ( d.proxy_config.domain_wildcard_alias ) {
          if ( d.proxy_config.domain_wildcard_alias.constructor === Array ) {
            wildcards = wildcards.concat( d.proxy_config.domain_wildcard_alias );
          } else {
            wildcards.push( d.proxy_config.domain_wildcard_alias );
          }
        }
      });

      return {
        domains: domains,
        wildcards: wildcards
      };
    });
};

/** *********************************
 *  collect the orphaned domains
 *
 *  @param {[string]} - distinct list of domains collected from the ES
 *  @returns {promise(array[string])}
 */
var collectOrphans_ = function( esDomains ) {

  return collectDomains_()
    .then( function( results ) {
      var domains = results.domains,
        wildcards = results.wildcards.map( function( item ) {
          return new RegExp( item.replace( /\./g, '\\.' ).replace( /\*/g, '.*' ) );
        }),
        orphans = [];

      esDomains.forEach( function( item ) {
        if ( domains[item] ) {
          return;
        }
        for ( var i = 0, len = wildcards.length; i < len; ++i ) {
          if ( wildcards[i].test( item ) ) {
            return;
          }
        }
        orphans.push( item );
      });

      if ( orphans.length ) {
        logger.warn( 'usageReport.js:collectOrphans_ found orphaned domains: [' + orphans.join(',') + '].' );
      }
      return orphans;
    })
    .catch( function( err ) {
      logger.error( 'usageReport.js:collectOrphans_ error: ' + err.toString() );
      logger.error( err.stack );
      throw err;
    });
};

/** *********************************
 *  send email with the orphaned domains list
 *  if [report_about_unknown_domains] config key is not set - it does nothing
 *
 *  @returns {promise()}
 */
var mailOrphans_ = function( orphans ) {

  if ( !config.report_about_unknown_domains ) {
    logger.warn( 'usageReport.js:mailOrphans_, config parameter report_about_unknown_domains is not set.' );
    return promise.resolve( false );
  }

  // account not found for domain
  var orphanedList = orphans.length ?
    '    [' + orphans.join('],\n    [') + ']' :
    '    [empty]';

  //  TODO: edit email body
  var mailOptions = {
    to: config.report_about_unknown_domains,
    subject: 'Orphaned Domains Daily Report',
    text: 'Hi buddy,\n\n' +
      'List of orphaned domains and domains without account:\n' + orphanedList + '\n\n' +
      'Have a nice day,\nRevAPM Report Bot\n'
  };

  return mail.sendMail( mailOptions )
    .catch( function( err ) {
      logger.error( 'usageReport.js:mailOrphans_ error: ' + err.toString() );
      logger.error( err.stack );
      throw err;
    });
};


//  ----------------------------------------------------------------------------------------------//
module.exports = {};

/** *********************************
 *  collect usage data for the given day
 *
 *  @param {string} - day must be string in "YYYY-MM-DD" format
 *  @param {[string]|string|null} - account_id can be array of IDs, one ID(string) or nothing
 *    to handle data for all accounts
 *  @param {bool} - dry run - no data saving, optional, default false
 *  @param {bool} - collect orphans passing by, domains those have no owners, log them and send by
 *    email, optional, default false
 *
 *  @returns {promise(object)}
 */
/** *********************************
 *  stored result will be:
 * {
 *   report_for_day: Tue Feb 23 2016 ...,
 *   created_at: Thu Feb 25 2016 ...,
 *   account_id: '000000000000000000000000',
 *   domains: {
 *       total: 000,
 *       deleted: 000,
 *       active: 000,
 *       ssl_enabled: 000
 *   },
 *   applications: {
 *       total: 000,
 *       deleted: 000,
 *       active: 000
 *   },
 *   api_keys: {
 *       total: 000,
 *       inactive: 000,
 *       active: 000
 *   },
 *   domains_usage: [{
 *           name: 'cdn.example.com',
 *           traffic_per_billing_zone: {
 *               'Europe': {
 *                   count: 000,
 *                   received_bytes: 000,
 *                   sent_bytes: 000,
 *                   billing_samples: {
 *                       '1456185600000': {
 *                           count: 000,
 *                           received_bytes: 000,
 *                           sent_bytes: 000
 *                       }, ....
 *                   }
 *               }, ....
 *           },
 *           ports: { '80': 000 },
 *           cache_hits: { MISS: 000, HIT: 000 }
 *       }, .... ]
 *   }
 * }

 *  returns summary
 * {
 *   report_for_day: Tue Feb 23 2016 ...,
 *   created_at: Thu Feb 25 2016 ...,
 *   account_id: 'ACCOUNTS_SUMMARY',
 *   domains: {
 *       total: 000,
 *       deleted: 000,
 *       active: 000,
 *       ssl_enabled: 000
 *   },
 *   applications: {
 *       total: 000,
 *       deleted: 000,
 *       active: 000
 *   },
 *   api_keys: {
 *       total: 000,
 *       inactive: 000,
 *       active: 000
 *   },
 *   traffic_per_billing_zone: {
 *       'Europe': {
 *           count: 000,
 *           received_bytes: 000,
 *           sent_bytes: 000,
 *           billing_samples: {
 *               '1456185600000': {
 *                   count: 000,
 *                   received_bytes: 000,
 *                   sent_bytes: 000
 *               }, ....
 *           }
 *       }, ....
 *   },
 *   traffic: {
 *       count: 000,
 *       received_bytes: 000,
 *       sent_bytes: 000,
 *       billing_samples: {
 *           '1456185600000': {
 *               count: 000,
 *               received_bytes: 000,
 *               sent_bytes: 000
 *           }, ....
 *       }
 *   },
 *   ports: { '80': 000 },
 *   cache_hits: { MISS: 000, HIT: 000 },
 *   mem_usage: { ... },
 *   op_result: { ok: 1, nInserted: 000, nUpserted: 000, nMatched: 000, nModified: 000 }
 * }
 *
 *  PLEASE note that applications, api_keys and domains datas are actual for the time this function
 *    invoked, not for the day given
 */
module.exports.collectDayReport = function( day, accountID, dry, orphans ) {

  if ( accountID && _.isString( accountID ) ) {
    accountID = [accountID];
  }

  var domainsList = [];
  var accOrphans = [];

  return promise.resolve( day )
    .then( parseDay_ )
    .then( function( d ) {
      day = d;
      return ( accountID ? domainsModel.domainsListForAccount( accountID, day ) : promise.resolve( false ) )
        .then( function( domains ) {
          return promise.all([
            collectWebTrafficData_( day, domains ),
            domainsModel.accountDomainsData( accountID, day ),
            locationsModel.code2BillingZoneMapping(),
            applicationsModel.accountAppsData( accountID ),
            apiKeysModel.accountAPIKeysData( accountID ),
            usersModel.countUsers(),
            sslNameModel.accountNamesCount( accountID ),
            domainsModel.accountDomainsCount( accountID )
          ]);
        });
    })
    .then( function( responses ) {

      var now = new Date(),
        accounts = {},
        accID = null,
        accDomains = responses[1],
        accSSLEnabled = responses[6],
        accDomainsCount = responses[7];

      //  unite 2 sets - domains counts and ssl_enabled counts
      _.forEach( accDomainsCount, function( item, aid ) {
        item.ssl_enabled = accSSLEnabled[aid] || 0;
      });
      _.forEach( accSSLEnabled, function( count, aid ) {
        if ( !accDomainsCount[aid] /*impossible*/ ) {
          accDomainsCount[aid] = {
            total: count,
            deleted: 0,
            active: count,
            ssl_enabled: count
          };
        }
      });

      //  users stat has nothing to do with accounts, but it must be stored anyway
      var users = {
        report_for_day: day,
        created_at: now,
        account_id: 'USERS_SUMMARY',
        users: responses[5/*users amount*/] //  { total: 0, deleted: 0, active: 0 }
      };

      for ( accID in accDomainsCount ) {
        if ( !accounts[accID] ) {
          accounts[accID] = genEmptyAccount_( day, now, accID );
        }
        accounts[accID].domains = accDomainsCount[accID];
      }

      for ( accID in responses[3/*account apps*/] ) {
        if ( !accounts[accID] ) {
          accounts[accID] = genEmptyAccount_( day, now, accID );
        }
        accounts[accID].applications = responses[3][accID];
      }

      for ( accID in responses[4/*account api keys*/] ) {
        if ( !accounts[accID] ) {
          accounts[accID] = genEmptyAccount_( day, now, accID );
        }
        accounts[accID].api_keys = responses[4][accID];
      }

      //  debug DO NOT REMOVE
      // responses[1/*account domains*/].domain_to_acc_id_map['assets.virtualsky.com'] = '5580981b9f59e3ee3e10c91c';
      //  debug

      responses[0/*web traffic*/].forEach( function( domain_data ) {

        var domain = domain_data.domain;
        domainsList.push( domain );

        accID = accDomains.domain_to_acc_id_map[domain];
        if ( !accID ) {
          //  domain->acc mapping not found, trying to find among wildcards
          for ( var i = 0, len = accDomains.domain_to_acc_id_wildcards.length; i < len; ++i ) {
            var wild = accDomains.domain_to_acc_id_wildcards[i];
            if ( wild.wildcard.test( domain ) ) {
              //  gotcha
              accID = wild.account_id;
              break;
            }
          }
        }

        if ( !accID ) {
          accOrphans.push( domain );
          logger.error( 'usageReport.js:collectDayReport, account not found for domain ' + domain + ', skipping' );
          return;
        }

        if ( !accounts[accID] ) {
          accounts[accID] = genEmptyAccount_( day, now, accID );
        }

        var acc = accounts[accID];
        if ( !acc.domains_usage[domain] ) {
          acc.domains_usage[domain] = {
            traffic_per_billing_zone: {},
            port_hits: domain_data.ports,
            cache_hits: domain_data.cache_hits
          };
        }

        //  domain's traffic grouped by hosts(proxies), the different hosts can belong to one billing zone
        //  so we have to accumulate traffic and samples passed through different proxies

        var domainTPBZ = acc.domains_usage[domain].traffic_per_billing_zone;
        domain_data.zones.forEach( function( z ) {
          var zone = responses[2/*code to billing zone*/][z.code] || ( 'Unknown(' + z.code + ')' );
          if ( !domainTPBZ[zone] ) {
            domainTPBZ[zone] = {};
          }
          accumulate_( domainTPBZ[zone], z );  // [host] and [code] will be skipped as strings
        });
      });

      responses = null;
      runGC_();

      //  decompose accounts object to an array
      var bulk = [];
      for( var aid in accounts ) {
        bulk.push( accounts[aid] );
      }
      accounts = bulk;
      runGC_();

      //  build day totals
      var totals = sumAccounts_( accounts, false/*no id, overall*/ );
      totals.report_for_day = day;
      totals.created_at = now;
      totals.users = users.users;
      checkTotalsIntegrity_( totals );

      //  save
      if ( !dry ) {

        accounts.forEach( function( acc ) {
          // decompose domains_usage to store in mongo
          var du = [];
          for ( var d in acc.domains_usage ) {
            acc.domains_usage[d].name = d;
            du.push( acc.domains_usage[d] );
          }
          acc.domains_usage = du;
        });
        accounts.push( users );

        return reportsModel.bulk_upsert( accounts )
          .then( function( data ) {
            totals.op_result = _.pick( data, ['ok', 'nInserted', 'nUpserted', 'nMatched', 'nModified'] );
            totals.mem_usage = process.memoryUsage();
            return totals;
          });
      }

      totals.mem_usage = process.memoryUsage();
      return totals;
    })
    .then( function( totals ) {
      if ( !orphans ) {
        return totals;
      }
      return collectOrphans_( domainsList )
        .then( function( orphans ) {
          //  concat 2 orphans lists, remove doubles and mail
          return mailOrphans_( _.uniq( orphans.concat( accOrphans ) ) );
        })
        .then( function() {
          return totals;
        });
    })
    .catch( function( err ) {
      var msg = 'usageReport.js:collectDayReport error: ' + err.toString();
      logger.error( msg );
      logger.error( err.stack );
      return { error: msg };
    });
};

/** *********************************
 *  checks if collected reports for the given account(s) are too old and re-collect day report
 *
 *  @param {int} to - end of timespan, ms
 *  @param {string|[string]} - accountID can be either ID(string), an array of IDs or an empty string for all accounts
 *    to be collected (revadmin)
 *  @returns {promise(object|false)} - object with stats or false if the recollection was not required
 */
var checkThenCollect_ = function( to, accountID ) {

  var today = Math.floor( Date.now() / 86400000/*day in ms*/ ) * 86400000; //  the very beginning of the day
  if ( to < today ) {
    //  time span with old upper bound, nothing to do
    return promise.resolve( false );
  } else {

    today = new Date( today );
    return reportsModel.lastCreatedAt( today, accountID )
      .then( function( ids ) {

        ids = ids.filter( function( item ) {
          //  absent or too old
          return !item.created_at || ( ( Date.now() - item.created_at.getTime() ) > config.usage_report_regen_age_ms );
        }).map( function( item ) {
          return item.account_id;
        });

        if ( ids.length ) {
          return module.exports.collectDayReport( today, ids )
            .then( function( totals ) {
              return promise.resolve({
                mem_usage: totals.mem_usage,
                op_result: totals.op_result,
                records_processed: totals.records_processed,
                report_for_day: totals.report_for_day,
                created_at: totals.created_at
              });
            });
        } else {
          //  today's report is still fresh enough
          return promise.resolve( false );
        }
      });
  }
};

/** *********************************
 *  load saved reports stored in the DB
 *
 *  @param {string|Date} - from/to represent inclusive date interval, accurate to day
 *    they must be strings either in "YYYY-MM-DD" format or just Dates
 *  @param {string|[string]} - accountID can be either ID(string), an array of IDs or an empty string for all accounts
 *    to be collected (revadmin)
 *  @param {bool} - onlyOverall, return overall summary only
 *  @param {bool} - keepSamples, return data with 5min samples
 *  @returns {promise(object)}
 */
module.exports.loadReports = function( from, to, accountID, onlyOverall, keepSamples ) {

  from = parseDay_( from );
  to = parseDay_( to );

  return promise.all([
      reportsModel.list( from, to, accountID ),
      accountsModel.idNameHash( accountID ),
      ( accountID ? domainsModel.domainsListForAccountGrouped( accountID, to ) : promise.resolve( {} ) )
    ])
    .then( function( resp ) {

      var reportsList = resp[0],
        accountID2Name = resp[1],
        accounts2Domains = resp[2];

      //  re-compose domains_usage
      reportsList.forEach( function( acc ) {
        if ( !acc.domains_usage ) {
          return;
        }
        var du = {};
        acc.domains_usage.forEach( function( d ) {
          du[d.name] = _.pick( d, ['traffic_per_billing_zone', 'port_hits', 'cache_hits'] );
        });
        acc.domains_usage = du;
      });

      //  filter accounts in line with accountID
      if ( accountID ) {

        if ( _.isString( accountID ) ) {
          accountID = [accountID];
        }

        accountID.forEach( function( id ) {
          if ( !accountID2Name[id] ) {
            accountID2Name[id] = 'Unknown';
            logger.error( 'usageReport.js:loadReports, company with id ' + id + ' not found.' );
          }
        });
      }

      var days = Math.floor( to.getTime() / 86400000/*day in ms*/ ) - Math.floor( from.getTime() / 86400000 ) + 1/*inclusive*/;
      var summaries = sumOverall_( reportsList, accountID2Name, days, keepSamples );
      if ( onlyOverall ) {
        //  only keep last record
        summaries = [summaries[summaries.length - 1]];
      }

      //  update summaries with domain list
      summaries.forEach( function( item ) {
        if ( item.account_id !== 'OVERALL_SUMMARY' ) {
          var accountID = item.account_id.slice( 0, -8/*_SUMMARY*/ );
          item.domains.list = accounts2Domains[accountID] || [];
        }
      });

      return summaries;
    })
    .catch( function( err ) {
      logger.error( 'usageReport.js:loadReports error: ' + err.toString() );
      logger.error( err.stack );
      return [];
    });
};

/** *********************************
 *  variation of the above:
 *  first check if upper bound [to] is today or later and then check if last report too old and then run
 *  collectDayReport before loadReports
 */
module.exports.checkLoadReports = function( from, to, accountID, onlyOverall, keepSamples ) {

  var recollected;
  return checkThenCollect_( to, accountID )
    .then( function( data ) {
      recollected = data;
      return module.exports.loadReports( from, to, accountID, onlyOverall, keepSamples );
    })
    .then( function( reports ) {
      if ( reports.length && recollected ) {
        reports[reports.length - 1].refreshed = recollected;
      }
      return reports;
    });
};


/** *********************************
 *  build date histogram for the given account and timespan
 *
 *  @param {object} span - like { start: 0, end: 0, interval: 0 } - result of utils.query2Span
 *    assuming all values in ms, start and end snapped to 5 min
 *  @param {string|[string]} - accountID can be either ID(string), an array of IDs or an empty string for all accounts to be collected (revadmin)
 *  @returns {promise(object)} - like:
 *  {
 *    "account_id": "5588869fbde7a0d00338ce8f",
 *    "from": 1468197000000,
 *    "from_utc": "2016-07-11T00:30:00.000Z",
 *    "to": 1468279800000,
 *    "to_utc": "2016-07-11T23:30:00.000Z",
 *    "interval": 1800000,
 *    "data": [{
 *        "time": 1468197000000,  // __start__ of an interval
 *        "time_utc": "2016-07-11T00:30:00.000Z",
 *        "count": 9000,
 *        "received_bytes": 3150000,
 *        "sent_bytes": 5744742
 *      }, {
 *        "time": 1468198800000,
 *        "time_utc": "2016-07-11T01:00:00.000Z",
 *        "count": 9000,
 *        "received_bytes": 3150000,
 *        "sent_bytes": 5743952
 *      }, ...
 */
module.exports.loadStats = function( span, accountID ) {

  //  snap span.start to whole number of intervals relatively to span.end
  span.start = span.end - Math.ceil( ( span.end - span.start ) / span.interval ) * span.interval;

  var fromDate = new Date( span.start ),
    toDate = new Date( span.end );
  fromDate.setUTCHours( 0, 0, 0, 0 );
  toDate.setUTCHours( 0, 0, 0, 0 );

  return reportsModel.list( fromDate, toDate, accountID )
    .then( function( reportsList ) {
      var histo = {},
        off = span.start - Math.floor( span.start / span.interval ) * span.interval,
        out_of_span = 0,
        errors = 0,
        samples = 0;
      for ( var t = span.start; t < span.end; t += span.interval ) {
        histo[t] = { samples: 0, count: 0, received_bytes: 0, sent_bytes: 0 };
      }

      reportsList.forEach( function( rep ) {
         rep.domains_usage.forEach( function( du ) {
            _.forEach( du.traffic_per_billing_zone, function( zone ) {
              _.forEach( zone.billing_samples, function( sample, time ) {
                var t = parseInt( time );
                if ( t < span.start || t >= span.end ) {
                  ++out_of_span;
                  return;
                }

                t = Math.floor( ( t - off ) / span.interval ) * span.interval + off;
                if ( !histo[t] ) {
                  ++errors;
                  logger.warn( 'usageReport.js:loadStats, sample not snapped to interval: ' + t + ', ' + (new Date(t)).toISOString() );
                  return;
                }

                ++histo[t].samples;
                histo[t].count += sample.count;
                histo[t].received_bytes += sample.received_bytes;
                histo[t].sent_bytes += sample.sent_bytes;
                ++samples;
              });
            });
         });
      });

      histo = Object.keys( histo ).map( function( item ) {
          return _.assign({ time: parseInt( item ), time_utc: (new Date( parseInt( item )) ).toISOString() }, histo[item] );
        }).sort( function( lhs, rhs ) {
          return lhs.time - rhs.time;
        });

      return {
        metadata: {
          account_id: accountID,
          from: span.start,
          from_datetime: (new Date( span.start ) ).toISOString(),
          to: span.end,
          to_datetime: (new Date( span.end ) ).toISOString(),
          interval: span.interval,
          offset: off,
          samples_processed: samples,
          samples_skipped: out_of_span,
          samples_failed: errors,
          data_points_count: histo.length
        },
        data: histo
      };
    })
    .catch( function( err ) {
      logger.error( 'usageReport.js:loadStats error: ' + err.toString() );
      logger.error( err.stack );
      return [];
    });
};

/** *********************************
 *  variation of the above:
 *  first check if upper bound [to] is today or later and then check if last report too old and then run
 *  collectDayReport before loadStats
 */
module.exports.checkLoadStats = function( span, accountID ) {

  var recollected;
  return checkThenCollect_( span.end, accountID )
    .then( function( data ) {
      recollected = data;
      return module.exports.loadStats( span, accountID );
    })
    .then( function( stats ) {
      if ( recollected ) {
        stats.metadata.recollected = recollected;
      }
      return stats;
    });
};


//  ----------------------------------------------------------------------------------------------//
// debug DO NOT REMOVE
// module.exports.collectTraff = function( day, account_id ) {
//   return collectWebTrafficData_( day, account_id );
// };
// debug
