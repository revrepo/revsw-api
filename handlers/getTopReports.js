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

//  ---------------------------------
exports.getTopReports = function(request, reply) {

  var domain_id = request.params.domain_id;
  var domain_name,
    field;

  domainConfigs.get(domain_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domain_id));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      domain_name = result.domain_name;
      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
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
        case 'http2':
          field = 'http2';
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
                      'gte': span.start,
                      'lte': span.end
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
        requestBody.query.filtered.filter.bool.must.push({
          term: {
            'geoip.country_code2': request.query.country
          }
        });
      }

      var indicesList = utils.buildIndexList(span.start, span.end);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domain_name ) );
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
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
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

//  ---------------------------------
exports.getTop5XX = function(request, reply) {

  var domain_id = request.params.domain_id;
  var domain_name;

  domainConfigs.get(domain_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domain_id));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      domain_name = result.domain_name;
      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

      var requestBody = {
        query: {
          filtered: {
            filter: {
              bool: {
                must: [{
                  range: {
                    '@timestamp': {
                      'gte': span.start,
                      'lte': span.end
                    }
                  }
                }, {
                  term: {
                    domain: domain_name
                  }
                }, {
                  prefix: {
                    response: '5'
                  }
                }]
              }
            }
          }
        },
        size: 0,
        aggs: {
          responses: {
            terms: {
              field: 'response',
              size: 30
            },
            aggs: {
              requests: {
                terms: {
                  field: '',
                  size: request.query.count || 30
                }
              }
            }
          }
        }
      };

      var indicesList = utils.buildIndexList(span.start, span.end);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domain_name ) );
        }
        var data = {};
        var count = 0;
        for ( var i0 = 0, len0 = body.aggregations.responses.buckets.length; i0 < len0; i0++ ) {
          var item = body.aggregations.responses.buckets[i0];
          data[item.key] = {
            count: item.doc_count,
            requests: []
          };
          for ( var i1 = 0, len1 = item.requests.buckets.length; i1 < len1; ++i1 ) {
            var req = item.requests.buckets[i1];
            data[item.key].requests.push({
              count: req.doc_count,
              request: req.key
            });
            ++count;
          }
        }

        var response = {
          metadata: {
            domain_name: domain_name,
            domain_id: domain_id,
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            data_points_count: count
          },
          data: data
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
