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
// Handler for Top Objects report
//
exports.getTopObjects = function(request, reply) {

  var domain_id = request.params.domain_id;
  var domain_name,
      filter = '',
      metadataFilterField,
      start_time,
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
        start_time = Date.now() - 3600000; // 1 hour back
      }

      if ( request.query.to_timestamp ) {
        end_time = utils.convertDateToTimestamp(request.query.to_timestamp);
        if ( ! end_time ) {
          return reply(boom.badRequest('Cannot parse the to_timestamp value'));
        }
      } else {
        end_time = request.query.to_timestamp || Date.now();
      }

      start_time = Math.floor(start_time/1000/300)*1000*300;
      end_time = Math.floor(end_time/1000/300)*1000*300;

      if ( start_time >= end_time ) {
        return reply(boom.badRequest('Period end timestamp cannot be less or equal period start timestamp'));
      }
      if ( (end_time - start_time ) > 24*3600*1000 ) {
        return reply(boom.badRequest('Requested report period exceeds 24 hours'));
      }

      filter = elasticSearch.buildESFilterString(request);
      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

      var requestBody = {
        'query': {
          'filtered': {
            'query': {
              'query_string': {
                'query': 'domain: \"' + domain_name + '\"' + filter,
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
        'size': 0,
        'aggs': {
          'results': {
            'terms': {
              'field': 'request',
              'size': request.query.count || 30,
              'order': {
                '_count': 'desc'
              }
            }
          }
        }
      };

      var indicesList = utils.buildIndexList(start_time, end_time);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 60,
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + start_time + ' ' + end_time + ', domain: ' + domain_name ) );
        }
        var dataArray = [];
        for ( var i = 0; i < body.aggregations.results.buckets.length; i++ ) {
          dataArray[i] = {
            path: body.aggregations.results.buckets[i].key,
            count: body.aggregations.results.buckets[i].doc_count
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
            total_hits: body.hits.total,
            filter: metadataFilterField,
            data_points_count: body.aggregations.results.buckets.length
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
