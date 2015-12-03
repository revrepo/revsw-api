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

var DomainConfig = require('../models/DomainConfig');

var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());


exports.getTopReports = function(request, reply) {

  var domain_id = request.params.domain_id;
  var domain_name,
    filter = '',
    field,
    start_time,
    end_time;

  domainConfigs.get(domain_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domain_id));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      domain_name = result.domain_name;

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
      if ( (end_time - start_time ) > (24*3600*1000 + 10*1000) ) {
        return reply(boom.badRequest('Requested report period exceeds 24 hours'));
      }

      request.query.report_type = (request.query.report_type) ? request.query.report_type : 'referer';

      switch (request.query.report_type) {
        case 'referer':
          field = 'referer';
          break;
        case 'status_code':
          field = 'response';
          break;
        case 'content_type':
          field = 'cont_type';
          break;
        case 'protocol':
          field = 'ipport';
          break;
        case 'http_protocol':
          field = 'protocol';
          break;
        case 'http_method':
          field = 'method';
          break;
        case 'content_encoding':
          field = 'cont_enc';
          break;
        case 'os':
          field = 'os';
          break;
        case 'device':
          field = 'device';
          break;
        case 'country':
          field = 'geoip.country_code2';
          break;
        case 'cache_status':
          field = 'cache';
          break;
        case 'request_status':
          field = 'conn_status';
          break;
        case 'QUIC':
          field = 'quic';
          break;
        default:
          return reply(boom.badImplementation('Received bad report_type value ' + request.query.report_type));
      }

      var requestBody = {
        query: {
          filtered: {
            filter: {
              bool: {
                must: [{
                  range: {
                    '@timestamp': {
                      'gte': start_time,
                      'lte': end_time
                    }
                  }
                }, {
                  term: {
                    domain: domain_name
                  }
                }]
              }
            }
          }
        },
        'size': 0,
        'aggs': {
          'results': {
            'terms': {
              'field': field,
              'size': request.query.count || 30,
              'order': {
                '_count': 'desc'
              }
            }
          },
          'missing_field': {
            'missing': {
              'field': field
            }
          }
        }
      };

      if (request.query.country) {
        requestBody.query.bool.must.push({
          term: {
            'geoip.country_code2': request.query.country
          }
        });
      }

      var indicesList = utils.buildIndexList(start_time, end_time);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + start_time + ' ' + end_time + ', domain: ' + domain_name ) );
        }
        var dataArray = [];
        for ( var i = 0; i < body.aggregations.results.buckets.length; i++ ) {
          dataArray[i] = {
            key: body.aggregations.results.buckets[i].key,
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
