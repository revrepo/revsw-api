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

//
// Get traffic stats
//

exports.getStats = function(request, reply) {

  var domain_id = request.params.domain_id,
    domain_name,
    metadataFilterField;

  domainConfigs.get(domain_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domain_id));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {
      domain_name = result.domain_name;

      var span = utils.query2Span( request.query, 24/*def start in hrs*/, 24*31/*allowed period - month*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

      var requestBody = {
        size: 0,
        query: {
          filtered: {
            filter: {
              bool: {
                must: [{
                  term: {
                    domain: domain_name
                  }
                }, {
                  range: {
                    '@timestamp': {
                      gte: span.start,
                      lt: span.end
                    }
                  }
                }],
                must_not: []
              }
            }
          }
        },
        aggs: {
          results: {
            date_histogram: {
              field: '@timestamp',
              interval: ( '' + span.interval ),
              // 'pre_zone_adjust_large_interval': true,  //  Deprecated in 1.5.0.
              min_doc_count: 0,
              extended_bounds : {
                min: span.start,
                max: ( span.end - 1 )
              },
              offset: ( '' + ( span.end % span.interval ) )
            },
            aggs: {
              sent_bytes: {
                sum: {
                  field: 's_bytes'
                }
              },
              received_bytes: {
                sum: {
                  field: 'r_bytes'
                }
              }
            }
          }
        }
      };

      var terms = elasticSearch.buildESQueryTerms(request);
      var sub = requestBody.query.filtered.filter.bool;
      sub.must = sub.must.concat( terms.must );
      sub.must_not = sub.must_not.concat( terms.must_not );

      elasticSearch.getClient().search({
        index: utils.buildIndexList(span.start, span.end),
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      })
      .then(function(body) {
        var dataArray = [];
        for ( var i = 0; i < body.aggregations.results.buckets.length; i++ ) {
          dataArray[i] = {
            time: body.aggregations.results.buckets[i].key,
            requests: body.aggregations.results.buckets[i].doc_count,
            sent_bytes: body.aggregations.results.buckets[i].sent_bytes.value,
            received_bytes: body.aggregations.results.buckets[i].received_bytes.value
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
            interval_sec: span.interval/1000,
            filter: metadataFilterField,
            data_points_count: body.aggregations.results.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domain_name));
      });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
