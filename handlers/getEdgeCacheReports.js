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

var async = require('async');
var _ = require('lodash');
var boom = require('boom');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;
var config = require('config');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');

var elasticSearch = require('../lib/elasticSearch');

var utils = require('../lib/utilities.js');

var logger = require('revsw-logger')(config.log_config);

var AuditEvents = require('../models/AuditEvents');
var DomainConfig = require('../models/DomainConfig');

var auditevents = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());
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
/**
 * @name getDataCacheObjects
 *
 * options = {
 *  startTimeValue_: start_time_value
 *  endTimeValue_ : end_time_value
 *  domain_config: domain_config
 * }
 * @param {any} options
 * @param {any} cb
 */
function getDataCacheObjects(options, cb) {
  var ESURL = elasticSearch.getClientURL();
  var startTimeValue_ = options.start_time_value;
  var endTimeValue_ = options.end_time_value;
  var domainConfig_ = options.domain_config;
  var domainName = '';
  var domainId = '';
  if (!!domainConfig_) {
    domainId = domainConfig_.id;
    domainName = domainConfig_.domain_name;
  }
  var filterParams_ = options.filter_params;
  var isFromCache = true;
  var keyOptions = _.clone(options); // NOTE: domain_config is big
  delete keyOptions.domain_config;
  keyOptions.domainId = domainId;
  keyOptions.domainName = domainName;
  var cacheKey = 'getDataCacheObjects:' + domainId + ':' + JSON.stringify(keyOptions);

  multiCache.wrap(cacheKey, function() {
      isFromCache = false;
      // NOTE: ES query for get data from ESURL
      var requestBody = {
        size: 0,
        query: {
          filtered: {
            filter: {
              bool: {
                must: [{
                  range: {
                    '@timestamp': {
                      gte: startTimeValue_,
                      lt: endTimeValue_
                    }
                  }
                }]
              }
            }
          }
        },
        aggs: {
          // uniq_requests: {
          //   cardinality: {
          //     field: 'request'
          //   }
          // },
          //“Number Of Unique Objects” (cardinality of “request” field when cache_ttl != “-” and large than 0)
          cache_object: {
            filter: {
              bool: {
                must_not: [{
                    term: {
                      cache_ttl: '-'
                    }
                  },
                  {
                    term: {
                      cache_ttl: '0'
                    }
                  }
                ]
              }
            },
            aggs: {
              number_of_unique_object: {
                cardinality: {
                  field: 'request'
                }
              },
              // “New Objects In The Edge Cache” (count of “request” field when cache_ttl != “-” and large than 0
              //and "cache_age": "0")
              new_objects_in_the_edge_cache: {
                filter: {
                  bool: {
                    must: [{
                      term: {
                        cache_age: '0'
                      }
                    }]
                  }
                },
                aggs: {
                  total: {
                    cardinality: {
                      field: 'request'
                    }
                  }
                }
              },
              // “Average Configured Edge Cache TTL” - take it from “cache_ttl” attribute (search for all records with cache_ttl != “-” and above zero)
              average_configured_edge_cache_ttl: {
                avg: {
                  script: 'try { Float.parseFloat(doc["cache_ttl"].value); } catch (NumberFormatException e) { return 0; }'
                }
              },
              //“Average Age Of Served Objects” - take it from “cache_age” field  (search for all records with cache_ttl != “-” and above zero and cache = HIT)
              cache_respond: {
                filter: {
                  bool: {
                    must: [{
                      term: {
                        cache: 'HIT'
                      }
                    }]
                  }
                },
                aggs: {
                  total: {
                    cardinality: {
                      field: 'request'
                    }
                  },
                  average_age_of_served_objects: {
                    avg: {
                      script: 'try { return Float.parseFloat(doc["cache_age"].value); } catch (NumberFormatException e) { return 0; }'
                    }
                  },
                  //“Average Cache Response Time” - take it from “upsteam_time” (search for all records with cache_ttl != “-”
                  // and above zero AND “cache_age” above zero and cache = HIT)
                  response_time: {
                    filter: {
                      bool: {
                        must_not: [{
                            term: {
                              cache_age: '0'
                            }
                          },
                          {
                            term: {
                              cache_age: '-'
                            }
                          }
                        ]
                      }
                    },
                    aggs: {
                      average_cache_response_time_sec: {
                        avg: {
                          script: 'try { return Float.parseFloat(doc["upstream_time"].value)*1000; } catch (NumberFormatException e) { return 0; }'
                        }
                      }
                    }
                  },
                }
              },
              //“Average Origin Response Time” - take it from “upstream_time” (search for all records with cache = MISS AND
              // cache_ttl != “-” and above zero AND “cache_age” = 0)
              origin_response: {
                filter: {
                  bool: {
                    must: [{
                      term: {
                        cache: 'MISS'
                      }
                    }, {
                      term: {
                        cache_age: '0'
                      }
                    }]
                  }
                },
                aggs: {
                  average_origin_response_time_sec: {
                    avg: {
                      script: 'try { return Float.parseFloat(doc["upstream_time"].value)*1000; } catch (NumberFormatException e) { return 0; }'
                    }
                  }
                }
              }
            }
          }
        }
      };
      //  update query
      elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, {
        query: filterParams_
      }, domainConfig_);

      return ESURL.search({
          index: utils.buildIndexList(startTimeValue_, endTimeValue_),
          ignoreUnavailable: true,
          query_cache: true,
          search_type: 'count', // NOTE: make it faster
          timeout: config.get('elasticsearch_timeout_ms'),
          body: requestBody
        })
        .then(function(data) {
          var response = {
            total_unique_objects: 0,
            new_unique_objects: 0,
            average_configured_edge_cache_ttl_sec: 0,
            average_age_for_served_objects_sec: 0,
            average_edge_cache_response_time_sec: 0,
            average_origin_response_time_sec: 0
          };

          if (!!data.aggregations && !!data.aggregations.cache_object) {
            var argData_ = data.aggregations.cache_object;
            if (!!argData_.number_of_unique_object) {
              response.total_unique_objects = argData_.number_of_unique_object.value || 0;
            }
            if (!!argData_.new_objects_in_the_edge_cache && !!argData_.new_objects_in_the_edge_cache.total) {
              response.new_unique_objects = argData_.new_objects_in_the_edge_cache.total.value || 0;
            }

            if (!!argData_.average_configured_edge_cache_ttl && !!argData_.average_configured_edge_cache_ttl.value) {
              try {
                response.average_configured_edge_cache_ttl_sec = parseFloat(argData_.average_configured_edge_cache_ttl.value / 1000).toFixed(0) || 0;
              } catch (e) {}
            }
            if (!!argData_.cache_respond) {
              var cacheRespond = argData_.cache_respond;
              if (!!cacheRespond.average_age_of_served_objects && !!cacheRespond.average_age_of_served_objects.value) {
                try {
                  response.average_age_for_served_objects_sec = parseFloat(cacheRespond.average_age_of_served_objects.value / 1000).toFixed(0) || 0;
                } catch (e) {}
              }
              if (!!cacheRespond.response_time && !!cacheRespond.response_time.average_cache_response_time_sec &&
                !!cacheRespond.response_time.average_cache_response_time_sec.value) {
                try {
                  response.average_edge_cache_response_time_sec = parseFloat(cacheRespond.response_time.average_cache_response_time_sec.value).toFixed(1);
                } catch (e) {}
              }
            }
            if (!!argData_.origin_response && !!argData_.origin_response && !!argData_.origin_response.average_origin_response_time_sec.value) {
              try {
                response.average_origin_response_time_sec = parseFloat(argData_.origin_response.average_origin_response_time_sec.value).toFixed(1);
              } catch (e) {}
            }
          }
          // response.data = data; // NOTE: ES result
          return response;
        });
    })
    .then(function(response) {
      if (isFromCache === true) {
        logger.info('getDataCacheObjects:return cache for key - ' + cacheKey);
      }
      cb(null, response);
    })
    .catch(function(error) {
      logger.error('getDataCacheObjects:Failed to retrieve data for ESURL for domain' + domainName);
      return cb(error);
    });
}
/**
 * @name getStatsEdgeCache
 */
module.exports.getStatsEdgeCache = function(request, reply) {
  var domainID = request.params.domain_id,
    domainName,
    queryProperties = _.clone(request.query);

  domainConfigs.get(domainID, function(error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {
      domainName = domainConfig.domain_name;
      var span = utils.query2Span(queryProperties, 24 /*def start in hrs*/ , 24 * 30 /* maxTimePeriodForTrafficGraphsDays /*allowed period - max count days*/ );
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      // NOTE: change start time for make correction graphs for shift all values
      var startTimeValue_ = span.start - span.interval;
      var endTimeValue_ = span.end;
      var cacheKey = 'getStatsEdgeCache:' + domainID + ':' + JSON.stringify(queryProperties);

      async.auto({
        report_data: function(cb) {
          var options = {
            start_time_value: startTimeValue_,
            end_time_value: endTimeValue_,
            domain_config: domainConfig,
            filter_params: request.query
          };
          getDataCacheObjects(options, cb);
        }
      }, function(err, reportData) {
        if (err) {
          logger.error('getStatsEdgeCache:' + err.message);
          return reply(boom.badImplementation('Failed to retrieve information'));
        }
        reply(reportData.report_data);
      });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
