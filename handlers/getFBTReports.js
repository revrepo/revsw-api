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

var boom = require( 'boom' );
var mongoose = require( 'mongoose' );

var utils = require( '../lib/utilities.js' );
var renderJSON = require( '../lib/renderJSON' );
var mongoConnection = require( '../lib/mongoConnections' );
var elasticSearch = require( '../lib/elasticSearch' );
var DomainConfig = require( '../models/DomainConfig' );

var domainConfigs = new DomainConfig( mongoose, mongoConnection.getConnectionPortal() );

//  ----------------------------------------------------------------------------------------------//
exports.getFBTAverage = function( request, reply ) {

  var domain_id = request.params.domain_id;
  domainConfigs.get( domain_id, function( error, result ) {
    if ( error ) {
      return reply( boom.badImplementation( 'Failed to retrieve domain details for ID ' + domain_id ) );
    }
    if ( result && utils.checkUserAccessPermissionToDomain( request, result ) ) {

      var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
      if ( span.error ) {
        return reply( boom.badRequest( span.error ) );
      }

      var domain_name = result.domain_name,
        delta = span.end - span.start,
        interval;

      if ( delta <= 3 * 3600000 ) {
        interval = 5 * 60000; // 5 minutes
      } else if ( delta <= 2 * 24 * 3600000 ) {
        interval = 30 * 60000; // 30 minutes
      } else if ( delta <= 8 * 24 * 3600000 ) {
        interval = 3 * 3600000; // 3 hours
      } else {
        interval = 12 * 3600000; // 12 hours
      }

      var requestBody = {
        size: 0,
        query: {
          filtered: {
            filter: {
              bool: {
                must: [ {
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
                } ],
                must_not: []
              }
            }
          }
        },
        aggs: {
          results: {
            date_histogram: {
              field: '@timestamp',
              interval: ( '' + interval ),
              min_doc_count: 0,
              offset: ( '' + ( span.end % interval ) )
            },
            aggs: {
              avg_fbt: {
                avg: {
                  field: 'FBT_mu'
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

      elasticSearch.getClient().search( {
          index: utils.buildIndexList( span.start, span.end ),
          ignoreUnavailable: true,
          timeout: 120000,
          body: requestBody
        } )
        .then( function( body ) {
          var dataArray = [];
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; i++ ) {
            var item = body.aggregations.results.buckets[i];
            dataArray[i] = {
              time: item.key,
              requests: item.doc_count,
              avg_fbt: item.avg_fbt.value
            };
          }
          var response = {
            metadata: {
              domain_name: domain_name,
              domain_id: domain_id,
              start_timestamp: span.start,
              start_datetime: new Date( span.start ),
              end_timestamp: span.end,
              end_datetime: new Date( span.end ),
              total_hits: body.hits.total,
              interval_sec: interval / 1000,
              data_points_count: body.aggregations.results.buckets.length
            },
            data: dataArray
          };
          renderJSON( request, reply, error, response );
        }, function( error ) {
          console.trace( error.message );
          return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
        } );
    } else {
      return reply( boom.badRequest( 'Domain not found' ) );
    }
  } );
};

//  ---------------------------------
exports.getFBTDistribution = function( request, reply ) {

  var domain_id = request.params.domain_id;
  domainConfigs.get( domain_id, function( error, result ) {
    if ( error ) {
      return reply( boom.badImplementation( 'Failed to retrieve domain details for ID ' + domain_id ) );
    }
    if ( result && utils.checkUserAccessPermissionToDomain( request, result ) ) {

      var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
      if ( span.error ) {
        return reply( boom.badRequest( span.error ) );
      }

      var domain_name = result.domain_name,
        interval = 300000;

      var requestBody = {
        size: 0,
        query: {
          filtered: {
            filter: {
              bool: {
                must: [ {
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
                }, {
                  range: {
                    FBT_mu: {
                      gt: 0,
                      lte: 30000000
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
            histogram: {
              field: 'FBT_mu',
              interval: ( '' + interval ),
              min_doc_count: 0
            }
          }
        }
      };

      var terms = elasticSearch.buildESQueryTerms(request);
      var sub = requestBody.query.filtered.filter.bool;
      sub.must = sub.must.concat( terms.must );
      sub.must_not = sub.must_not.concat( terms.must_not );

      elasticSearch.getClient().search( {
          index: utils.buildIndexList( span.start, span.end ),
          ignoreUnavailable: true,
          timeout: 120000,
          body: requestBody
        } )
        .then( function( body ) {
          var dataArray = [];
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; i++ ) {
            var item = body.aggregations.results.buckets[i];
            dataArray[i] = {
              key: item.key,
              requests: item.doc_count
            };
          }
          var response = {
            metadata: {
              domain_name: domain_name,
              domain_id: domain_id,
              start_timestamp: span.start,
              start_datetime: new Date( span.start ),
              end_timestamp: span.end,
              end_datetime: new Date( span.end ),
              total_hits: body.hits.total,
              interval_ms: interval / 1000,
              data_points_count: body.aggregations.results.buckets.length
            },
            data: dataArray
          };
          renderJSON( request, reply, error, response );
        }, function( error ) {
          console.trace( error.message );
          return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
        } );
    } else {
      return reply( boom.badRequest( 'Domain not found' ) );
    }
  } );
};

