/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var _ = require('lodash');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;
var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch   = require('../lib/elasticSearch');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var GEO_COUNTRIES_REGIONS = require('../config/geo_countries_regions');
var maxTimePeriodForTrafficGraphsDays = config.get('max_time_period_for_traffic_graphs_days');
var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
  store: 'memory',
  max: config.get('cache_memory_max_bytes'),
  ttl: config.get('cache_memory_ttl_seconds')/*seconds*/,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);
/**
 * @name getGBTReports
 */
exports.getGBTReports = function(request, reply) {
  var reportType = request.query.report_type || 'country';
  var domainID = request.params.domain_id,
    domainName,
    field,
    isFromCache = true,
    queryProperties = _.clone(request.query);
  // NOTE: make correction for the time range
  _.merge(queryProperties, utils.roundTimestamps(request.query, 5));

  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {
      domainName = domainConfig.domain_name;

      var span = utils.query2Span(queryProperties, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

      switch(reportType) {
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
          return reply(boom.badImplementation('Received bad report_type value ' + reportType));
      }
      var cacheKey = 'getGBTReports:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function() {
        isFromCache = false;
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
                  }]
                }
              }
            }
          },
          size: 0,
          aggs: {
            results: {
              terms: {
                field: field,
                size: queryProperties.count || 30
              },
              aggs: {
                sent_bytes: { sum: { field: 's_bytes' } },
                received_bytes: { sum: { field: 'r_bytes' } }
              }
            },
            missing_field: {
              missing: { field: field },
              aggs: {
                sent_bytes: { sum: { field: 's_bytes' } },
                received_bytes: { sum: { field: 'r_bytes' } }
              }
            }
          }
        };

      //  add 2 sub-aggregations for country
        if( reportType === 'country' ) {
        requestBody.aggs.results.aggs.regions = {
          terms: {
            field: 'geoip.region_name',
            size: 0
          },
          aggs: {
            sent_bytes: { sum: { field: 's_bytes' } },
            received_bytes: { sum: { field: 'r_bytes' } }
          }
        };
        requestBody.aggs.results.aggs.missing_regions = {
          missing: {
            field: 'geoip.region_name',
          },
          aggs: {
            sent_bytes: { sum: { field: 's_bytes' } },
            received_bytes: { sum: { field: 'r_bytes' } }
          }
        };
      }

      //  update query
      elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, false, domainConfig );

      var indicesList = utils.buildIndexList(span.start, span.end);
      return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      }).then(function(body) {
        if (!body.aggregations ) {
          return promise.reject({error_message: 'Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName });
        }

        var dataArray = body.aggregations.results.buckets.map( function( res ) {
          var item = {
            key: res.key,
            count: res.doc_count,
            sent_bytes: res.sent_bytes.value,
            received_bytes: res.received_bytes.value
          };
          if ( res.regions && res.regions.buckets.length ) {
            var countryInfo = _.find(GEO_COUNTRIES_REGIONS, function(item) {
              return item.code_iso2 === res.key;
            });
            if(!!countryInfo) {
              // NOTE: prepare return data for all regions in country
              item.regions = _.map(countryInfo.regions, function(itemRegion) {
                var region_ = {
                  key: itemRegion.code,
                  count: 0, // NOTE: set default value
                  sent_bytes: 0, // NOTE: set default value
                  received_bytes: 0 // NOTE: set default value
                };
                // NOTE: add 'hc-key' for correct show data on highcharts map
                if(!!itemRegion['hc-key']) {
                  region_['hc-key'] = itemRegion['hc-key'];
                }
                // NOTE: add additional information about including region data to another region
                if(!!itemRegion['in-key']) {
                  region_['in-key'] = itemRegion['in-key'];
                }
                var i = _.find(res.regions.buckets, function(itm) {
                  return itemRegion.code === itm.key;
                });
                if(!!i) {
                  region_.count = i.doc_count;
                  region_.sent_bytes = i.sent_bytes.value;
                  region_.received_bytes = i.received_bytes.value;
                }
                return region_;
              });
            } else {
              item.regions = res.regions.buckets.map( function( region ) {
                return {
                  key: region.key,
                  count: region.doc_count,
                  sent_bytes: region.sent_bytes.value,
                  received_bytes: region.received_bytes.value
                };
              });
            }
          }
          if ( res.missing_regions && res.missing_regions.doc_count ) {
            if ( !item.regions ) {
              item.regions = [];
            }
            var region = res.missing_regions;
            item.regions.push({
              key: '--',
              count: region.doc_count,
              sent_bytes: region.sent_bytes.value,
              received_bytes: region.received_bytes.value
            });
          }
          return item;
        });

        if ( body.aggregations.missing_field && body.aggregations.missing_field.doc_count ) {
          var res = body.aggregations.missing_field;
          dataArray.push({
            key: '--',
            count: res.doc_count,
            sent_bytes: res.sent_bytes.value,
            received_bytes: res.received_bytes.value
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
            filter: elasticSearch.buildMetadataFilterString(request),
            data_points_count: body.aggregations.results.buckets.length
          },
          data: dataArray
        };
        return response;
      });
      })
      .then(function(response){
        if(isFromCache === true) {
          logger.info('getGBTReports:return cache for key - ' + cacheKey);
        }
        renderJSON(request, reply, error, response);
      })
      .catch(function(error) {
        logger.error('getGBTReports:Failed to retrieve data for domain ' + domainName);
        var errorText = 'Failed to retrieve data from ES data for domain ' + domainName;
        if(!!error && !!error.error_message){
          errorText = error.error_message;
        }
        return reply(boom.badImplementation(errorText));
      });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
