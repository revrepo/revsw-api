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
//  ----------------------------------------------------------------------------------------------//

var boom = require('boom');
var _ = require('lodash');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;
var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch = require('../lib/elasticSearch');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var maxTimePeriodForTrafficGraphsDays = config.get('max_time_period_for_traffic_graphs_days');
var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
  store: 'memory',
  max: config.get('cache_memory_max_bytes'),
  ttl: config.get('cache_memory_ttl_seconds') /*seconds*/ ,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);
var permissionCheck = require('./../lib/requestPermissionScope');
//  ----------------------------------------------------------------------------------------------//
/**
 * @name getFBTAverage
 * @description method get data FBT average stats for a domain
 */
exports.getFBTAverage = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    isFromCache = true,
    queryProperties = _.clone(request.query);
  // NOTE: make correction for the time range
  _.merge(queryProperties, utils.roundTimestamps(request.query, 5));
  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && permissionCheck.checkPermissionsToResource(request, domainConfig, 'domains')) {
      domainName = domainConfig.domain_name;
      // NOTE: make correction for the time range
      _.merge(queryProperties, utils.roundTimestamps(request.query, 5));
      var span = utils.query2Span(queryProperties, 24 /*def start in hrs*/ , 24 * maxTimePeriodForTrafficGraphsDays /*allowed period - max count days*/ );
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      var cacheKey = 'getFBTAverage:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function() {
          isFromCache = false;
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
                  interval: ('' + span.interval),
                  min_doc_count: 0,
                  extended_bounds: {
                    min: span.start,
                    max: (span.end - 1)
                  },
                  offset: ('' + (span.end % span.interval))
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
          elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, request, domainConfig);

          return elasticSearch.getClient().search({
              index: utils.buildIndexList(span.start, span.end),
              ignoreUnavailable: true,
              query_cache: true,
              timeout: config.get('elasticsearch_timeout_ms'),
              body: requestBody
            })
            .then(function(body) {
              var dataArray = [];
              for (var i = 0, len = body.aggregations.results.buckets.length; i < len; i++) {
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
                  start_datetime: new Date(span.start),
                  end_timestamp: span.end,
                  end_datetime: new Date(span.end),
                  total_hits: body.hits.total,
                  interval_sec: span.interval / 1000,
                  data_points_count: body.aggregations.results.buckets.length
                },
                data: dataArray
              };
              return response;
            });
        })
        .then(function(response) {
          if (isFromCache === true) {
            logger.info('getFBTAverage:return cache for key - ' + cacheKey);
          }
          renderJSON(request, reply, error, response);
        })
        .catch(function(error) {
          logger.error('getFBTAverage:Failed to retrieve data for domain ' + domainName);
          return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

//  ---------------------------------
/**
 * @name getFBTDistribution
 * @description method get data FBT distribution for a domain
 */
exports.getFBTDistribution = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    isFromCache = true,
    queryProperties = _.clone(request.query);
  // NOTE: make correction for the time range
  _.merge(queryProperties, utils.roundTimestamps(request.query, 5));
  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && permissionCheck.checkPermissionsToResource(request, domainConfig, 'domains')) {
      domainName = domainConfig.domain_name;

      var span = utils.query2Span(queryProperties, 24 /*def start in hrs*/ , 24 * maxTimePeriodForTrafficGraphsDays /*allowed period - max count days*/ );
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      var cacheKey = 'getFBTDistribution:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function() {
          isFromCache = false;
          var interval = (queryProperties.interval_ms || 100) * 1000,
            limit = (queryProperties.limit_ms || 10000) * 1000;

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
                  interval: ('' + interval),
                  min_doc_count: 0
                }
              }
            }
          };

          //  update query
          elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, request, domainConfig);

          return elasticSearch.getClient().search({
              index: utils.buildIndexList(span.start, span.end),
              ignoreUnavailable: true,
              query_cache: true,
              timeout: config.get('elasticsearch_timeout_ms'),
              body: requestBody
            })
            .then(function(body) {
              var dataArray = [];
              for (var i = 0, len = body.aggregations.results.buckets.length; i < len; i++) {
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
                  start_datetime: new Date(span.start),
                  end_timestamp: span.end,
                  end_datetime: new Date(span.end),
                  total_hits: body.hits.total,
                  interval_ms: interval / 1000,
                  limit_ms: limit / 1000,
                  data_points_count: body.aggregations.results.buckets.length
                },
                data: dataArray
              };
              return response;
            });
        })
        .then(function(response) {
          if (isFromCache === true) {
            logger.info('getFBTDistribution:return cache for key - ' + cacheKey);
          }
          renderJSON(request, reply, error, response);
        })
        .catch(function(error) {
          logger.error('getFBTDistribution:Failed to retrieve data for domain ' + domainName);
          return reply(boom.badImplementation('Failed to retrieve data from ES data for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

//  ---------------------------------
/**
 * @name getFBTHeatmap
 * @description method get data FBT for a domain grouped by countries
 */
exports.getFBTHeatmap = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    isFromCache = true,
    queryProperties = _.clone(request.query);
  // NOTE: make correction for the time range
  _.merge(queryProperties, utils.roundTimestamps(request.query, 5));

  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && permissionCheck.checkPermissionsToResource(request, domainConfig, 'domains')) {
      domainName = domainConfig.domain_name;

      var span = utils.query2Span(queryProperties, 1 /*def start in hrs*/ , 24 /*allowed period in hrs*/ );
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      var cacheKey = 'getFBTHeatmap:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function() {
          isFromCache = false;
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
                  size: queryProperties.count || 30
                },
                aggs: {
                  fbt_avg: {
                    avg: {
                      field: 'FBT_mu'
                    }
                  },
                  fbt_min: {
                    min: {
                      field: 'FBT_mu'
                    }
                  },
                  fbt_max: {
                    max: {
                      field: 'FBT_mu'
                    }
                  },
                  regions: {
                    terms: {
                      field: 'geoip.region_name',
                      size: 0
                    },
                    aggs: {
                      fbt_avg: {
                        avg: {
                          field: 'FBT_mu'
                        }
                      },
                      fbt_min: {
                        min: {
                          field: 'FBT_mu'
                        }
                      },
                      fbt_max: {
                        max: {
                          field: 'FBT_mu'
                        }
                      }
                    }
                  },
                  missing_regions: {
                    missing: {
                      field: 'geoip.region_name',
                    },
                    aggs: {
                      fbt_avg: {
                        avg: {
                          field: 'FBT_mu'
                        }
                      },
                      fbt_min: {
                        min: {
                          field: 'FBT_mu'
                        }
                      },
                      fbt_max: {
                        max: {
                          field: 'FBT_mu'
                        }
                      }
                    }
                  }
                }
              },
              missing_countries: {
                missing: {
                  field: 'geoip.country_code2',
                },
                aggs: {
                  fbt_avg: {
                    avg: {
                      field: 'FBT_mu'
                    }
                  },
                  fbt_min: {
                    min: {
                      field: 'FBT_mu'
                    }
                  },
                  fbt_max: {
                    max: {
                      field: 'FBT_mu'
                    }
                  }
                }
              }
            }
          };

          //  update query
          elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, false, domainConfig);

          var indicesList = utils.buildIndexList(span.start, span.end);
          return elasticSearch.getClientURL().search({
            index: indicesList,
            ignoreUnavailable: true,
            timeout: config.get('elasticsearch_timeout_ms'),
            body: requestBody
          }).then(function(body) {
            if (!body.aggregations) {
              return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
                ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName));
            }
            var dataArray = body.aggregations.countries.buckets.map(function(country) {
              var item = {
                key: country.key,
                count: country.doc_count,
                fbt_avg_ms: Math.round(country.fbt_avg.value / 1000),
                fbt_min_ms: Math.round(country.fbt_min.value / 1000),
                fbt_max_ms: Math.round(country.fbt_max.value / 1000),
                regions: []
              };
              if (country.regions && country.regions.buckets.length) {
                item.regions = country.regions.buckets.map(function(region) {
                  return {
                    key: region.key,
                    count: region.doc_count,
                    fbt_avg_ms: Math.round(region.fbt_avg.value / 1000),
                    fbt_min_ms: Math.round(region.fbt_min.value / 1000),
                    fbt_max_ms: Math.round(region.fbt_max.value / 1000)
                  };
                });
              }
              if (country.missing_regions && country.missing_regions.doc_count) {
                var region = country.missing_regions;
                item.regions.push({
                  key: '--',
                  count: region.doc_count,
                  fbt_avg_ms: Math.round(region.fbt_avg.value / 1000),
                  fbt_min_ms: Math.round(region.fbt_min.value / 1000),
                  fbt_max_ms: Math.round(region.fbt_max.value / 1000)
                });
              }
              return item;
            });

            if (body.aggregations.missing_countries && body.aggregations.missing_countries.doc_count) {
              var country = body.aggregations.missing_countries;
              dataArray.push({
                key: '--',
                count: country.doc_count,
                fbt_avg_ms: Math.round(country.fbt_avg.value / 1000),
                fbt_min_ms: Math.round(country.fbt_min.value / 1000),
                fbt_max_ms: Math.round(country.fbt_max.value / 1000),
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
            return response;
          });
        })
        .then(function(response) {
          if(isFromCache === true) {
            logger.info('getFBTHeatmap:return cache for key - ' + cacheKey);
          }
          renderJSON(request, reply, error, response);
        })
        .catch(function(error) {
          logger.error('getFBTHeatmap:Failed to retrieve data for domain ' + domainName);
          return reply(boom.badImplementation('Failed to retrieve data from ES data for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
