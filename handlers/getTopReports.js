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

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

//  ---------------------------------
var top_reports_ = function( req, reply, domain_name, span ) {

  req.query.report_type = req.query.report_type || 'referer';

  var field;
  switch (req.query.report_type) {
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
      return reply(boom.badImplementation('Received bad report_type value ' + req.query.report_type));
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
          'size': req.query.count || 30,
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

  if (req.query.country) {
    requestBody.query.filtered.filter.bool.must.push({
      term: {
        'geoip.country_code2': req.query.country
      }
    });
  }

  var indicesList = utils.buildIndexList(span.start, span.end);
  return elasticSearch.getClientURL().search({
      index: indicesList,
      ignoreUnavailable: true,
      timeout: config.get('elasticsearch_timeout_ms'),
      body: requestBody
    })
    .then(function(body) {
      if ( !body.aggregations ) {
        return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
          ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domain_name ) );
      }

      var data = [];
      var missed_total = 0;
      for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
        var item = body.aggregations.results.buckets[i];
        if ( field === 'cache' && item.key !== 'HIT' ) {
          //  special treatment for cache's MISS and occasional "-" values
          missed_total += item.doc_count;
        } else {
          data.push({
            key: item.key,
            count: item.doc_count
          });
        }
      }
      if ( field === 'cache' ) {
        data.push({
          key: 'MISS',
          count: missed_total
        });
      }
      var response = {
        metadata: {
          domain_name: domain_name,
          domain_id: req.params.domain_id,
          start_timestamp: span.start,
          start_datetime: new Date(span.start),
          end_timestamp: span.end,
          end_datetime: new Date(span.end),
          total_hits: body.hits.total,
          data_points_count: body.aggregations.results.buckets.length
        },
        data: data
      };
      // renderJSON(req, reply, error, response);
      renderJSON( req, reply, false/*error is undefined here*/, response );
    })
    .catch( function(error) {
      logger.error(error);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });
};

//  ---------------------------------
var top_5xx_ = function( req, reply, domain_name, span ) {

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
              field: 'request',
              size: req.query.count || 30
            }
          }
        }
      }
    }
  };

  var indicesList = utils.buildIndexList(span.start, span.end);
  return elasticSearch.getClientURL().search({
      index: indicesList,
      ignoreUnavailable: true,
      timeout: config.get('elasticsearch_timeout_ms'),
      body: requestBody
    })
    .then(function(body) {

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
          data[item.key].requests.push({
            count: item.requests.buckets[i1].doc_count,
            request: item.requests.buckets[i1].key
          });
          ++count;
        }
      }

      var response = {
        metadata: {
          domain_name: domain_name,
          domain_id: req.params.domain_id,
          start_timestamp: span.start,
          start_datetime: new Date(span.start),
          end_timestamp: span.end,
          end_datetime: new Date(span.end),
          total_hits: body.hits.total,
          data_points_count: count
        },
        data: data
      };
      renderJSON( req, reply, false/*error is undefined here*/, response );
    })
    .catch( function(error) {
      logger.error(error);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });
};


//  ---------------------------------
exports.getTopReports = function( request, reply ) {

  var domain_id = request.params.domain_id;

  domainConfigs.get(domain_id, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domain_id));
    }

    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

      if ( request.query.report_type === 'top5xx' ) {
        return top_5xx_( request, reply, result.domain_name, span );
      } else {
        return top_reports_( request, reply, result.domain_name, span );
      }
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};

