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
var buildAccountDomainsData_ = function() {

  return domains.queryP( {}, { _id: 0, domain_name: 1, account_id: 1, deleted: 1, 'proxy_config.rev_component_bp.enable_security': 1 } )
    .then( function( data ) {
      var map = {};
      var dist = {};
      data.forEach( function( item ) {
        map[item.domain_name] = item.account_id.toString();

        if ( !dist[item.account_id] ) {
          dist[item.account_id] = { total: 0, deleted: 0, active: 0, ssl_enabled: 0 };
        }
        if ( item.deleted ) {
          ++dist[item.account_id].deleted;
        } else {
          ++dist[item.account_id].active;
        }
        if ( item.proxy_config &&
            item.proxy_config.rev_component_bp &&
            item.proxy_config.rev_component_bp.enable_security ) {
          ++dist[item.account_id].ssl_enabled;
        }
        ++dist[item.account_id].total;
      });
      return {
        domain_to_acc_id_map: map,
        account_domains_count: dist
      };
    });
};

//  ---------------------------------
var buildAccountAppsData_ = function() {

  return applications.queryP( {}, { _id: 0, account_id: 1, deleted: 1 } )
    .then( function( data ) {
      var dist = {};
      data.forEach( function( item ) {
        if ( !dist[item.account_id] ) {
          dist[item.account_id] = { total: 0, deleted: 0, active: 0 };
        }
        if ( item.deleted ) {
          ++dist[item.account_id].deleted;
        } else {
          ++dist[item.account_id].active;
        }
        ++dist[item.account_id].total;
      });
      return {
        account_apps_count: dist
      };
    });
};

//  ---------------------------------
var buildAccountAPIKeysData_ = function() {

  return apiKeys.queryP( {}, { _id: 0, account_id: 1, active: 1 } )
    .then( function( data ) {
      var dist = {};
      data.forEach( function( item ) {
        if ( !dist[item.account_id] ) {
          dist[item.account_id] = { total: 0, inactive: 0, active: 0 };
        }
        if ( item.active ) {
          ++dist[item.account_id].active;
        } else {
          ++dist[item.account_id].inactive;
        }
        ++dist[item.account_id].total;
      });
      return {
        account_api_keys_count: dist
      };
    });
};

//  ---------------------------------
var buildCode2BillingZoneMapping_ = function() {

  return locations.queryP( {}, { _id: 0, site_code_name: 1, billing_zone: 1 } )
    .then( function( data ) {
      var map = {};
      data.forEach( function( item ) {
        map[item.site_code_name] = item.billing_zone;
      });
      return map;
    });
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
          terms: { field: 'domain', size: 1000 },
          aggs: {
            hosts: {
              terms: { field: 'host', size: 100 },
              aggs: {
                total_sent: {
                  sum: { field: 's_bytes' }
                },
                total_received: {
                  sum: {field: 'r_bytes' }
                },
                burst: {
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
      // debug
      var domains = resp.aggregations.domains.buckets.length,
        hosts = 0,
        intervals = 0;
      // debug
      if ( resp.aggregations && resp.aggregations.domains.buckets.length ) {
        traff = resp.aggregations.domains.buckets.map( function( domain ) {
          var d_ = {};
          d_.domain = domain.key;
          d_.count = domain.doc_count;
          d_.bytes_received = 0;
          d_.bytes_sent = 0;
          hosts += domain.hosts.buckets.length;
          d_.zones = domain.hosts.buckets.map( function( zone ) {
            d_.bytes_received += zone.total_received.value;
            d_.bytes_sent += zone.total_sent.value;
            intervals += zone.burst.buckets.length;
            return {
              host: zone.key,
              code: zone.key.slice( 0, ( zone.key.indexOf( '-' ) ) ),
              count: zone.doc_count,
              zone_bytes_received: zone.total_received.value,
              zone_bytes_sent: zone.total_sent.value,
              burst:  zone.burst.buckets.map( function( ival ) {

                return {
                  count: ival.doc_count,
                  bytes_received: ival.received.value,
                  bytes_sent: ival.sent.value
                };
              })
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

      // debug
      logger.warn( 'domains: ', domains );
      logger.warn( 'hosts: ', hosts );
      logger.warn( 'intervals: ', intervals );
      // debug

      return traff;
    });
};


//  ----------------------------------------------------------------------------------------------//



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
        buildAccountDomainsData_(),
        buildCode2BillingZoneMapping_(),
        collectWebTrafficData_( day ),
        buildAccountAppsData_(),
        buildAccountAPIKeysData_()
      ]);
    })
    .then( function( responses ) {

      // return responses;
      var accounts = {};
      responses[2/*web traffic*/].forEach( function( d ) {
        var acc_id = responses[0/*account domains*/].domain_to_acc_id_map[d.domain];
        if ( !acc_id ) {
          logger.warn( 'account not found for domain ' + d.domain + ', skipping' );
          return;
        }
        if ( !accounts[acc_id] ) {
          accounts[acc_id] = {
            report_for_day: day,
            account_id: acc_id,
            domains: responses[0/*account domains*/].account_domains_count[acc_id],
            domains_usage: {},
            applications: responses[3/*account apps*/].account_apps_count[acc_id],
            api_keys: responses[4/*account api keys*/].account_api_keys_count[acc_id],
            traffic_per_billing_zone: {}
          };
        }
        var domain = d.domain.replace( /\./g, '+' );
        var acc = accounts[acc_id];
        if ( !acc.domains_usage[domain] ) {
          acc.domains_usage[domain] = {
            traffic_total: {
              incoming_bytes: d.bytes_received,
              outgoing_bytes: d.bytes_sent,
              count: d.count
            },
            traffic_per_billing_zone: {},
            ports: d.ports,
            cache_hits: d.cache_hits
          };
        }

        var tpbz = acc.domains_usage[domain].traffic_per_billing_zone;
        d.zones.map( function( z ) {
          var zone = responses[1/*code to billing zone*/][z.code] || ( 'Unknown(' + z.code + ')' );
          tpbz[zone] = {
            incoming_bytes: z.zone_bytes_received,
            outgoing_bytes: z.zone_bytes_sent,
            count: z.count
          };
          if ( !acc.traffic_per_billing_zone[zone] ) {
            acc.traffic_per_billing_zone[zone] = {
              incoming_bytes: z.zone_bytes_received,
              outgoing_bytes: z.zone_bytes_sent,
              count: z.count
            };
          } else {
            acc.traffic_per_billing_zone[zone].incoming_bytes += z.zone_bytes_received;
            acc.traffic_per_billing_zone[zone].outgoing_bytes += z.zone_bytes_sent;
            acc.traffic_per_billing_zone[zone].count += z.count;
          }
        });
      });

      //  decompose hash to array
      var bulk = [];
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
