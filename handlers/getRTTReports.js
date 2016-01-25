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


exports.getRTTReports = function(request, reply) {

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

      request.query.report_type = request.query.report_type || 'country';

      switch (request.query.report_type) {
        case 'country':
          field = 'geoip.country_code2';
          break;
        case 'os':
          field = 'os';
          break;
        case 'device':
          field = 'device';
          break;
        default:
          return reply(boom.badImplementation('Received bad report_type value ' + request.query.report_type));
      }

      var requestBody = {
        'query': {
          filtered: {
            filter: {
              'bool': {
                'must': [{
                  'term': {
                    'domain': domain_name
                  }
                }, {
                  'range': {
                    'lm_rtt': {
                      'gt': 1000
                    }
                  }
                }, {
                  'range': {
                    '@timestamp': {
                      'gte': span.start,
                      'lte': span.end
                    }
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
              'size': request.query.count || 30
            },
            'aggs': {
              'rtt_avg': {
                'avg': {
                  'field': 'lm_rtt'
                }
              },
              'rtt_min': {
                'min': {
                  'field': 'lm_rtt'
                }
              },
              'rtt_max': {
                'max': {
                  'field': 'lm_rtt'
                }
              }
            }
          },
          'missing_field': {
            'missing': {
              'field': field
            },
            'aggs': {
              'rtt_avg': {
                'avg': {
                  'field': 'lm_rtt'
                }
              },
              'rtt_min': {
                'min': {
                  'field': 'lm_rtt'
                }
              },
              'rtt_max': {
                'max': {
                  'field': 'lm_rtt'
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
        var dataArray = [];
        for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
          var doc = body.aggregations.results.buckets[i];
          dataArray.push({
            key: doc.key,
            count: doc.doc_count,
            lm_rtt_avg_ms: Math.round( doc.rtt_avg.value / 1000 ),
            lm_rtt_min_ms: Math.round( doc.rtt_min.value / 1000 ),
            lm_rtt_max_ms: Math.round( doc.rtt_max.value / 1000 )
          });
        }
        if ( body.aggregations.missing_field && body.aggregations.missing_field.doc_count ) {
          doc = body.aggregations.missing_field;
          dataArray.push({
            key: '--',
            count: doc.doc_count,
            lm_rtt_avg_ms: Math.round( doc.rtt_avg.value / 1000 ),
            lm_rtt_min_ms: Math.round( doc.rtt_min.value / 1000 ),
            lm_rtt_max_ms: Math.round( doc.rtt_max.value / 1000 )
          });
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
            filter: elasticSearch.buildMetadataFilterString(request),
            data_points_count: body.aggregations.results.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};
