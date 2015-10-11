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

var boom     = require('boom');
var mongoose = require('mongoose');

var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch   = require('../lib/elasticSearch');

var Domain = require('../models/Domain');

var domains = new Domain(mongoose, mongoConnection.getConnectionPortal());
//
// Get traffic stats
//

exports.getStats = function(request, reply) {

  var domain_id = request.params.domain_id,
    domain_name,
    start_time,
    filter = '',
    interval,
    time_period,
    end_time;

  domains.get({
    _id: domain_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {
      domain_name = result.name;

      if ( request.query.from_timestamp ) {
        start_time = utils.convertDateToTimestamp(request.query.from_timestamp);
        if ( ! start_time ) {
          return reply(boom.badRequest('Cannot parse the from_timestamp value'));
        }
      } else {
        start_time = Date.now() - 3600000*24; // 24 hours back
      }

      if ( request.query.to_timestamp ) {
        end_time = utils.convertDateToTimestamp(request.query.to_timestamp);
        if ( ! end_time ) {
          return reply(boom.badRequest('Cannot parse the to_timestamp value'));
        }
      } else {
        end_time = request.query.to_timestamp || Date.now();
      }

      if ( start_time >= end_time ) {
        return reply(boom.badRequest('Period end timestamp cannot be less or equal period start timestamp'));
      }
      if ( start_time < ( Date.now() - 31*24*3600*1000 ) ) {
        return reply(boom.badRequest('Period start timestamp cannot be more than a month back from the current time'));
      }

      start_time = Math.floor(start_time/1000/300)*1000*300;
      end_time = Math.floor(end_time/1000/300)*1000*300;

      time_period = end_time - start_time;

      if ( time_period <= 3*3600*1000 ) {
        interval = 5*60*1000; // 5 minutes
      } else if ( time_period <= 2*24*3600*1000 ) {
        interval = 30*60*1000; // 30 minutes
      } else if ( time_period <= 8*24*3600*1000 ) {
        interval = 6*3600*1000; // 6 hours
      } else {
        interval = 12*3600*1000; // 12 hours
      }

      filter = elasticSearch.buildESFilterString(request);

      var requestBody = {
        'size': 0,
        'query': {
          'filtered': {
            'query': {
              'query_string': {
                'query': 'domain: \'' + domain_name + '\'' + filter,
                'analyze_wildcard': true
              }
            },
            'filter': {
              'bool': {
                'must': [{
                  'range': {
                    '@timestamp': {
                      'gte': start_time,
                      'lte': end_time
                    }
                  }
                }],
                'must_not': []
              }
            }
          }
        },
        'aggs': {
          'results': {
            'date_histogram': {
              'field': '@timestamp',
              'interval': interval.toString(),
              'pre_zone_adjust_large_interval': true,
              'min_doc_count': 0,
              'extended_bounds': {
                'min': start_time,
                'max': end_time
              }
            },
            'aggs': {
              'sent_bytes': {
                'sum': {
                  'field': 's_bytes'
                }
              },
              'received_bytes': {
                'sum': {
                  'field': 'r_bytes'
                }
              }
            }
          }
        }
      };

      elasticSearch.getClient().msearch( { body: [ {
        index: utils.buildIndexList(start_time, end_time),
        ignoreUnavailable: true,
        search_type: 'count',
        timeout: 60 },
        requestBody ]
      }).then(function(body) {
        var dataArray = [];
        for ( var i = 0; i < body.responses[0].aggregations.results.buckets.length; i++ ) {
          dataArray[i] = {
            time: body.responses[0].aggregations.results.buckets[i].key,
            requests: body.responses[0].aggregations.results.buckets[i].doc_count,
            sent_bytes: body.responses[0].aggregations.results.buckets[i].sent_bytes.value,
            received_bytes: body.responses[0].aggregations.results.buckets[i].received_bytes.value
          };
        }
        var response = {
          metadata: {
            domain_name: domain_name,
            domain_id: domain_id,
            start_timestamp: start_time,
            start_datetime: new Date(start_time),
            end_timestamp: end_time,
            end_datetime: new Date(end_time),
            total_hits: body.responses[0].hits.total,
            interval_sec: interval/1000,
            data_points_count: body.responses[0].aggregations.results.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        console.trace(error.message);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};
