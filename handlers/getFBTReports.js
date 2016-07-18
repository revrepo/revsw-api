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

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require( '../models/DomainConfig' );
var domainConfigs = new DomainConfig( mongoose, mongoConnection.getConnectionPortal() );

//  ----------------------------------------------------------------------------------------------//
exports.getFBTAverage = function( request, reply ) {

  var domainID = request.params.domain_id;
  domainConfigs.get( domainID, function( error, domainConfig ) {
    if ( error ) {
      return reply( boom.badImplementation( 'Failed to retrieve domain details for ID ' + domainID ) );
    }
    if ( domainConfig && utils.checkUserAccessPermissionToDomain( request, domainConfig ) ) {

      var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
      if ( span.error ) {
        return reply( boom.badRequest( span.error ) );
      }

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
                } ]
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
              avg_fbt: {
                avg: {
                  field: 'FBT_mu'
                }
              }
            }
          }
        }
      };

      //  update query
      elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, request, domainConfig );
      var domainName = domainConfig.domain_name;

      elasticSearch.getClient().search( {
          index: utils.buildIndexList( span.start, span.end ),
          ignoreUnavailable: true,
          timeout: config.get('elasticsearch_timeout_ms'),
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
              domain_name: domainName,
              domain_id: domainID,
              start_timestamp: span.start,
              start_datetime: new Date( span.start ),
              end_timestamp: span.end,
              end_datetime: new Date( span.end ),
              total_hits: body.hits.total,
              interval_sec: span.interval / 1000,
              data_points_count: body.aggregations.results.buckets.length
            },
            data: dataArray
          };
          renderJSON( request, reply, error, response );
        }, function( error ) {
          return reply( boom.badImplementation( 'Failed to retrieve data from ES for domain ' + domainName ) );
        } );
    } else {
      return reply( boom.badRequest( 'Domain ID not found' ) );
    }
  } );
};

//  ---------------------------------
exports.getFBTDistribution = function( request, reply ) {

  var domainID = request.params.domain_id;
  domainConfigs.get( domainID, function( error, domainConfig ) {
    if ( error ) {
      return reply( boom.badImplementation( 'Failed to retrieve domain details for ID ' + domainID ) );
    }
    if ( domainConfig && utils.checkUserAccessPermissionToDomain( request, domainConfig ) ) {

      var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
      if ( span.error ) {
        return reply( boom.badRequest( span.error ) );
      }

      var domainName = domainConfig.domain_name,
        interval = ( request.query.interval_ms || 100 ) * 1000,
        limit = ( request.query.limit_ms || 10000 ) * 1000;

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
                }, {
                  range: {
                    FBT_mu: {
                      gte: 0,
                      lte: limit
                    }
                  }
                }]
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

      //  update query
      elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, request, domainConfig );

      elasticSearch.getClient().search( {
          index: utils.buildIndexList( span.start, span.end ),
          ignoreUnavailable: true,
          timeout: config.get('elasticsearch_timeout_ms'),
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
              domain_name: domainName,
              domain_id: domainID,
              start_timestamp: span.start,
              start_datetime: new Date( span.start ),
              end_timestamp: span.end,
              end_datetime: new Date( span.end ),
              total_hits: body.hits.total,
              interval_ms: interval / 1000,
              limit_ms: limit / 1000,
              data_points_count: body.aggregations.results.buckets.length
            },
            data: dataArray
          };
          renderJSON( request, reply, error, response );
        }, function( error ) {
          return reply( boom.badImplementation( 'Failed to retrieve data from ES data for domain ' + domainName ) );
        } );
    } else {
      return reply( boom.badRequest( 'Domain ID not found' ) );
    }
  } );
};

//  ---------------------------------
exports.getFBTHeatmap = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName;

  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {

      domainName = domainConfig.domain_name;
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
                    FBT_mu: {
                      gte: 0
                    }
                  }
                }, {
                  range: {
                    '@timestamp': {
                      gte: span.start,
                      lte: span.end
                    }
                  }
                }]
              }
            }
          }
        },
        size: 0,
        aggs: {
          countries: {
            terms: {
              field: 'geoip.country_code2',
              size: request.query.count || 30
            },
            aggs: {
              fbt_avg: { avg: { field: 'FBT_mu' } },
              fbt_min: { min: { field: 'FBT_mu' } },
              fbt_max: { max: { field: 'FBT_mu' } },
              regions: {
                terms: {
                  field: 'geoip.region_name',
                  size: 0
                },
                aggs: {
                  fbt_avg: { avg: { field: 'FBT_mu' } },
                  fbt_min: { min: { field: 'FBT_mu' } },
                  fbt_max: { max: { field: 'FBT_mu' } }
                }
              },
              missing_regions: {
                missing: {
                  field: 'geoip.region_name',
                },
                aggs: {
                  fbt_avg: { avg: { field: 'FBT_mu' } },
                  fbt_min: { min: { field: 'FBT_mu' } },
                  fbt_max: { max: { field: 'FBT_mu' } }
                }
              }
            }
          },
          missing_countries: {
            missing: {
              field: 'geoip.country_code2',
            },
            aggs: {
              fbt_avg: { avg: { field: 'FBT_mu' } },
              fbt_min: { min: { field: 'FBT_mu' } },
              fbt_max: { max: { field: 'FBT_mu' } }
            }
          }
        }
      };

      //  update query
      elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, false, domainConfig );

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
        var dataArray = body.aggregations.countries.buckets.map( function( country ) {
          var item = {
            key: country.key,
            count: country.doc_count,
            fbt_avg_ms: Math.round( country.fbt_avg.value / 1000 ),
            fbt_min_ms: Math.round( country.fbt_min.value / 1000 ),
            fbt_max_ms: Math.round( country.fbt_max.value / 1000 ),
            regions: []
          };
          if ( country.regions && country.regions.buckets.length ) {
            item.regions = country.regions.buckets.map( function( region ) {
              return {
                key: region.key,
                count: region.doc_count,
                fbt_avg_ms: Math.round( region.fbt_avg.value / 1000 ),
                fbt_min_ms: Math.round( region.fbt_min.value / 1000 ),
                fbt_max_ms: Math.round( region.fbt_max.value / 1000 )
              };
            });
          }
          if ( country.missing_regions && country.missing_regions.doc_count ) {
            var region = country.missing_regions;
            item.regions.push({
              key: '--',
              count: region.doc_count,
              fbt_avg_ms: Math.round( region.fbt_avg.value / 1000 ),
              fbt_min_ms: Math.round( region.fbt_min.value / 1000 ),
              fbt_max_ms: Math.round( region.fbt_max.value / 1000 )
            });
          }
          return item;
        });

        if ( body.aggregations.missing_countries && body.aggregations.missing_countries.doc_count ) {
          var country = body.aggregations.missing_countries;
          dataArray.push({
            key: '--',
            count: country.doc_count,
            fbt_avg_ms: Math.round( country.fbt_avg.value / 1000 ),
            fbt_min_ms: Math.round( country.fbt_min.value / 1000 ),
            fbt_max_ms: Math.round( country.fbt_max.value / 1000 ),
            regions: []
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
            data_points_count: body.aggregations.countries.buckets.length
          },
          data: dataArray
        };
        renderJSON(request, reply, error, response);
      }, function(error) {
        return reply(boom.badImplementation('Failed to retrieve data from ES data for domain ' + domainName));
      });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
