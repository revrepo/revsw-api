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

// var User = require('../models/User');
var DomainConfig = require('../models/DomainConfig');
var Location = require('../models/Location');

var locations = new Location(mongoose, mongoConnection.getConnectionPortal());
var domains = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());



//  ----------------------------------------------------------------------------------------------//

var build_account_domains_data_ = function() {

  return domains.queryP( {}, { _id: 0, domain_name: 1, account_id: 1, deleted: 1 } )
    .then( function( data ) {
      var map = {};
      var dist = {};
      data.forEach( function( item ) {
        map[item.domain_name] = item.account_id.toString();

        if ( !dist[item.account_id] ) {
          dist[item.account_id] = { deleted: 0, active: 0 };
        }
        if ( item.deleted ) {
          ++dist[item.account_id].deleted;
        } else {
          ++dist[item.account_id].active;
        }
      });
      return {
        domain_to_acc_id_map: map,
        account_domains_count: dist
      };
    });
};

//  ---------------------------------
var build_code_to_billing_zone_mapping_ = function() {

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
var collect_web_traffic_data_ = function( from_ts, to_ts ) {

  var span = utils.span2Span( from_ts, to_ts );
  if ( span.error ) {
    logger.error( 'collect_es_traffic_data_(): ' + span.error );
    return promise.reject( new Error( span.error ) );
  }

  var query = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [{
                range: {
                  '@timestamp': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              }]
            }
          }
        }
      },
      aggs: {
        domains: {
          terms: { field: 'domain', size: 200 },
          aggs: {
            hosts: {
            terms: { field: 'host', size: 100 },
              aggs: {
                total_sent: {
                  sum: { field: 's_bytes' }
                },
                total_received: {
                  sum: {field: 'r_bytes' }
                }
              }
            }
          }
        }
      }
    };

  return es.getClient().search( {
      index: utils.buildIndexList( span.start, span.end ),
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
          d_.bytes_received = 0;
          d_.bytes_sent = 0;
          d_.zones = domain.hosts.buckets.map( function( zone ) {
            d_.bytes_received += zone.total_received.value;
            d_.bytes_sent += zone.total_sent.value;
            return {
              host: zone.key,
              code: zone.key.slice( 0, ( zone.key.indexOf( '-' ) ) ),
              count: zone.doc_count,
              bytes_received: zone.total_received.value,
              bytes_sent: zone.total_sent.value
            };
          });
          return d_;
        });
      }
      return traff;
    });
};

//  ----------------------------------------------------------------------------------------------//



//  ----------------------------------------------------------------------------------------------//
module.exports = {};

module.exports.collect = function( from_ts, to_ts ) {

  return promise.all([
      build_account_domains_data_(),
      build_code_to_billing_zone_mapping_(),
      collect_web_traffic_data_( from_ts, to_ts )
    ]).then( function( responses ) {

      // return responses;
      var report = { accounts: {} };
      responses[2/*web traffic*/].forEach( function( d ) {
        var acc_id = responses[0/*account domains*/].domain_to_acc_id_map[d.domain];
        if ( !acc_id ) {
          console.log( 'domain to account mapping not found for ' + d.domain );
          return;
        }
        if ( !report.accounts[acc_id] ) {
          report.accounts[acc_id] = {
            domains: responses[0/*account domains*/].account_domains_count[acc_id],
            domains_usage: {},
            traffic_per_billing_zone: {}
          };
        }
        var acc = report.accounts[acc_id];
        if ( !acc.domains_usage[d.domain] ) {
          acc.domains_usage[d.domain] = {
            traffic_total: {
              incoming_bytes: d.bytes_received,
              outgoing_bytes: d.bytes_sent,
              count: d.count
            },
            traffic_per_billing_zone: {}
          };
        }

        var tpbz = acc.domains_usage[d.domain].traffic_per_billing_zone;
        d.zones.map( function( z ) {
          var zone = responses[1/*code to billing zone*/][z.code] || ( 'Unknown(' + z.code + ')' );
          tpbz[zone] = {
            incoming_bytes: z.bytes_received,
            outgoing_bytes: z.bytes_sent,
            count: z.count
          };
          if ( !acc.traffic_per_billing_zone[zone] ) {
            acc.traffic_per_billing_zone[zone] = {
              incoming_bytes: z.bytes_received,
              outgoing_bytes: z.bytes_sent,
              count: z.count
            };
          } else {
            acc.traffic_per_billing_zone[zone].incoming_bytes += z.bytes_received;
            acc.traffic_per_billing_zone[zone].outgoing_bytes += z.bytes_sent;
            acc.traffic_per_billing_zone[zone].count += z.count;
          }
        });
      });
      return report;
    })
    .catch( function( err ) {
      console.log( err );
    });
};
