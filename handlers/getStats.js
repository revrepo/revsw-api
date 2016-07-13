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

  var domainID = request.params.domain_id,
    domainName,
    metadataFilterField;

  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {
      domainName = domainConfig.domain_name;

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
          results: {
            date_histogram: {
              field: '@timestamp',
              interval: ( '' + span.interval ),
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

      //  update query
      elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, request, domainConfig );

      elasticSearch.getClient().search({
        index: utils.buildIndexList(span.start, span.end),
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      })
      .then(function(body) {
        var dataArray = [];
        for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; i++ ) {
          var item = body.aggregations.results.buckets[i];
          dataArray.push({
            time: item.key,
            requests: item.doc_count,
            sent_bytes: item.sent_bytes.value,
            received_bytes: item.received_bytes.value
          });
        }
        var response = {
          metadata: {
            domain_name: domainName,
            domain_id: domainID,
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            interval_sec: span.interval/1000,
            filter: metadataFilterField,
            data_points_count: len
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
