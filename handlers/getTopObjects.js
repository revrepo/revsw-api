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
// Handler for Top Objects report
//
exports.getTopObjects = function(request, reply) {

  var domainID = request.params.domain_id;
  var domainName,
      metadataFilterField;

  domainConfigs.get(domainID, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      domainName = result.domain_name;
      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

      var requestBody = {
        query: {
          filtered: {
            filter: {
              bool: {
                must: [{
                  range: {
                    '@timestamp': {
                      gte: span.start,
                      lte: span.end
                    }
                  }
                }, {
                  term: {
                    domain: domainName
                  }
                }],
                must_not: []
              }
            }
          }
        },
        size: 0,
        aggs: {
          results: {
            terms: {
              field: 'request',
              size: request.query.count || 30,
              order: {
                _count: 'desc'
              }
            }
          }
        }
      };
      var terms = elasticSearch.buildESQueryTerms(request);
      var sub = requestBody.query.filtered.filter.bool;
      sub.must = sub.must.concat( terms.must );
      sub.must_not = sub.must_not.concat( terms.must_not );

      var indicesList = utils.buildIndexList(span.start, span.end);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName ) );
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
            domain_name: domainName,
            domain_id: domainID,
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            filter: metadataFilterField,
            data_points_count: body.aggregations.results.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

//
//
//

exports.getSlowestFBTObjects = function(request, reply) {

  var domainID = request.params.domain_id;
  var domainName,
      metadataFilterField;

  domainConfigs.get(domainID, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      domainName = result.domain_name;
      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }
      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

      var requestBody = {
        query: {
          filtered: {
            filter: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: span.start,
                        lte: span.end
                      }
                    }
                  },
                  { term: { domain: domainName } },
                  { range: { FBT_mu: { gt: 1000 } } }
                ],
                must_not: []
              }
            }
          }
        },
        size: 0,
        aggs: {
          results: {
            terms: {
              field: 'request',
              min_doc_count: 2,
              order : { fbt_avg : 'desc' },
              size: ( request.query.count || 30 )
            },
            aggs: {
              fbt_avg: { avg: { field: 'FBT_mu' } },
              fbt_min: { min: { field: 'FBT_mu' } },
              fbt_max: { max: { field: 'FBT_mu' } }
            }
          }
        }
      };
      var terms = elasticSearch.buildESQueryTerms(request);
      var sub = requestBody.query.filtered.filter.bool;
      sub.must = sub.must.concat( terms.must );
      sub.must_not = sub.must_not.concat( terms.must_not );

      var indicesList = utils.buildIndexList(span.start, span.end);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName ) );
        }
        var dataArray = body.aggregations.results.buckets.map( function( item ) {
          return {
            path: item.key,
            count: item.doc_count,
            fbt_max: Math.round( item.fbt_max.value / 1000 ),
            fbt_min: Math.round( item.fbt_min.value / 1000 ),
            fbt_avg: Math.round( item.fbt_avg.value / 1000 )
          };
        });

        var response = {
          metadata: {
            domain_name: domainName,
            domain_id: domainID,
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            filter: metadataFilterField,
            data_points_count: body.aggregations.results.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

exports.getSlowestDownloadObjects = function(request, reply) {

  var domainID = request.params.domain_id;
  var domainName,
      metadataFilterField;

  domainConfigs.get(domainID, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      domainName = result.domain_name;
      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }
      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

      var requestBody = {
        query: {
          filtered: {
            filter: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: span.start,
                        lte: span.end
                      }
                    }
                  },
                  { term: { domain: domainName } },
                  { range: { duration: { gt: 0 } } }
                ],
                must_not: []
              }
            }
          }
        },
        size: 0,
        aggs: {
          results: {
            terms: {
              field: 'request',
              min_doc_count: 1,
              order : { duration_avg : 'desc' },
              size: ( request.query.count || 30 )
            },
            aggs: {
              duration_avg: { avg: { field: 'duration' } },
              duration_min: { min: { field: 'duration' } },
              duration_max: { max: { field: 'duration' } },
              size_avg: { avg: { field: 's_bytes' } }
            }
          }
        }
      };

      var terms = elasticSearch.buildESQueryTerms(request);
      var sub = requestBody.query.filtered.filter.bool;
      sub.must = sub.must.concat( terms.must );
      sub.must_not = sub.must_not.concat( terms.must_not );

      var indicesList = utils.buildIndexList(span.start, span.end);
      elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      }).then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName ) );
        }
        var dataArray = body.aggregations.results.buckets.map( function( item ) {
          return {
            path: item.key,
            count: item.doc_count,
            duration_max: Math.round( item.duration_max.value * 1000 ),
            duration_min: Math.round( item.duration_min.value * 1000 ),
            duration_avg: Math.round( item.duration_avg.value * 1000 ),
            size_avg: Math.round( item.size_avg.value )
          };
        });

        var response = {
          metadata: {
            domain_name: domainName,
            domain_id: domainID,
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            filter: metadataFilterField,
            data_points_count: body.aggregations.results.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
