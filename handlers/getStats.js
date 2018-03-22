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
var boom     = require('boom');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;
var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch   = require('../lib/elasticSearch');
var moment = require('moment');
var _ = require('lodash');
var config = require('config');
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
  ttl: config.get('cache_memory_ttl_seconds')/*seconds*/,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);
var permissionCheck = require('./../lib/requestPermissionScope');
//
// Get traffic stats
//

//  ---------------------------------
exports.getStats = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    metadataFilterField,
    isFromCache = true,
    queryProperties = _.clone(request.query);
  // NOTE: make correction for the time range
  _.merge(queryProperties, utils.roundTimestamps(request.query, 5));
  // NOTE: get only actual data about domain config for validate user access permisions
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
      // NOTE: change start time for make correction graphs for shift all values
      var startTimeValue_ = span.start - span.interval;
      var cacheKey = 'getStats:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function() {
          isFromCache = false;
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
                          gte: startTimeValue_,
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
                    min: startTimeValue_,
                    max: span.end
                  },
                  offset: ('' + (span.end % span.interval))
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
          elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, request, domainConfig);
          return elasticSearch.getClient().search({
              index: utils.buildIndexList(startTimeValue_, span.end),
              ignoreUnavailable: true,
              query_cache: true,
              timeout: config.get('elasticsearch_timeout_ms'),
              body: requestBody
            })
            .then(function(body) {
              var dataArray = [];
              // NOTE: i equal "1" for apply action "shift all values"
              for (var i = 1, len = body.aggregations.results.buckets.length; i < len; i++) {
                var itemTime = body.aggregations.results.buckets[i];
                var itemData = body.aggregations.results.buckets[i-1];
                dataArray.push({
                  time: itemTime.key,
                  requests: itemData.doc_count,
                  sent_bytes: itemData.sent_bytes.value,
                  received_bytes: itemData.received_bytes.value
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
                  interval_sec: span.interval / 1000,
                  filter: metadataFilterField,
                  data_points_count: len - 1 // NOTE: correction a count data point for action "shift all values"
                },
                data: dataArray
              };
              return response;
            });
      })
        .then(function(response) {
          if (isFromCache === true) {
            logger.info('getStats:return cache for key - ' + cacheKey);
          }
          renderJSON(request, reply, error, response);
        })
        .catch(function(error) {
          logger.error('getStats:Failed to retrieve data for domain ' + domainName);
          return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
/**
 * @name getStatsDomainActivity
 *
 */
exports.getStatsDomainActivity = function(request, reply) {
    var maxTimePeriodForActivityDays = 60; // TODO: rebase to config
    var domainID = request.params.domain_id,
      domainName,
      accountID,
      sslCertID,
      wafRulesIDs = [],
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
        var span = utils.query2Span(queryProperties, 24 /*def start in hrs*/ , 24 * maxTimePeriodForActivityDays /*allowed period - max count days*/ );
        if (span.error) {
          return reply(boom.badRequest(span.error));
        }
        sslCertID = (!!domainConfig.ssl_cert_id) ? domainConfig.ssl_cert_id : null;
        accountID = (!!domainConfig.proxy_config) ? domainConfig.proxy_config.account_id : domainConfig.account_id;
        if (!!domainConfig.proxy_config && !!domainConfig.proxy_config.rev_component_bp) {
          wafRulesIDs = _.chain(domainConfig.proxy_config.rev_component_bp.waf).map(function(itemWaf) {
            return itemWaf.waf_rules;
          }).flatten().uniq().value();
        }
        // NOTE: change start time for make correction graphs for shift all values
        var startTimeValue_ = span.start - span.interval;
        var endTime = span.end;
        var cacheKey = 'getStatsDomainActivity:' + domainID + ':' + JSON.stringify(queryProperties);

        memoryCache.wrap(cacheKey, function(cacheCallback) {
            isFromCache = false;
            async.auto({
              events: function(cb) {
                var params = {};
                var $or = [];

                params['meta.datetime'] = {
                  '$gte': startTimeValue_,
                  '$lte': endTime
                };

                $or.push({
                  'meta.target_id': domainID,
                  'meta.activity_target': 'domain',
                  'meta.activity_type': 'publish' //'modify'
                });

                $or.push({
                  'meta.target_id': domainID,
                  'meta.activity_target': 'domain',
                  'meta.activity_type': 'purge'
                });
                // NOTE: add information about a current SSL Certificate used in domain
                if (!!sslCertID) {
                  $or.push({
                    'meta.target_id': sslCertID,
                    'meta.activity_target': 'sslcert',
                    'meta.activity_type': { $in: ['publish'] }
                  });
                }
                // NOTE: add information about a current WAF Rules
                if (wafRulesIDs.length > 0) {
                  $or.push({
                    'meta.target_id': { $in: wafRulesIDs },
                    'meta.activity_target': 'wafrule',
                    'meta.activity_type': { $in: ['publish'] } //,'modify'
                  });
                }
                params.$or = $or;
                auditevents.list({ $query: params, $orderby: { 'meta.datetime': 1 } }, function(error, data) {
                  if (error) {
                    cb(error);
                    return;
                  }
                  cb(null, data);
                });
              }
            }, cacheCallback);
          }, { ttl: config.get('cache_memory_ttl_seconds') },
          function(error, results) {
            var dataArray = [];
            var response = {
              metadata: {
                domain_name: domainName,
                domain_id: domainID,
                start_timestamp: span.start,
                start_datetime: new Date(span.start),
                end_timestamp: span.end,
                end_datetime: new Date(span.end),
                interval_sec: span.interval / 1000
              },
              data: []
            };
            if (!!results.events && results.events.length > 0) {
              dataArray = results.events;
            }
            response.data = dataArray;
            if (isFromCache === true) {
              logger.info('getStatsDomainActivity:return cache for key - ' + cacheKey);
            }
            renderJSON(request, reply, error, response);
          });
      } else {
        return reply(boom.badRequest('Domain ID not found'));
      }
    });
};
//  ---------------------------------
/**
 * @name getStatsImageEngine
 * @description method get data for ImageEngine graph
 */
exports.getStatsImageEngine = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    metadataFilterField,
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
      // NOTE: change start time for make correction graphs for shift all values
      var startTimeValue_ = span.start - span.interval;
      var cacheKey = 'getStatsImageEngine:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function() {
          isFromCache = false;
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
                          gte: startTimeValue_,
                          lt: span.end
                        }
                      }
                    }],
                    must_not: [{
                        missing: {
                          'field' : 'ie_bytes_o'
                        }
                      }
                    ]
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
                    min: startTimeValue_,
                    max: span.end
                  },
                  offset: ('' + (span.end % span.interval))
                },
                aggs: {
                  sent_bytes: {
                    sum: {
                      field: 's_bytes'
                    }
                  },
                  original_bytes: {
                    sum: {
                      field: 'ie_bytes_o'
                    }
                  }
                }
              }
            }
          };

          //  update query
          elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, request, domainConfig);

          return elasticSearch.getClient().search({
              index: utils.buildIndexList(startTimeValue_ , span.end),
              ignoreUnavailable: true,
              query_cache: true,
              timeout: config.get('elasticsearch_timeout_ms'),
              body: requestBody
            })
            .then(function(body) {
              var dataArray = [];
              // NOTE: i equal "1" for apply action "shift all values"
              for (var i = 1, len = body.aggregations.results.buckets.length; i < len; i++) {
                var itemTime = body.aggregations.results.buckets[i];
                var itemData = body.aggregations.results.buckets[i - 1];
                dataArray.push({
                  time: itemTime.key,
                  requests: itemData.doc_count,
                  sent_bytes: itemData.sent_bytes.value,
                  original_bytes: itemData.original_bytes.value
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
                  interval_sec: span.interval / 1000,
                  filter: metadataFilterField,
                  data_points_count: len - 1 // NOTE: correction a count data point for action "shift all values"
                },
                data: dataArray
              };
              return response;
            });
        })
        .then(function(response) {
          if (isFromCache === true) {
            logger.info('getStatsImageEngine:return cache for key - ' + cacheKey);
          }
          renderJSON(request, reply, error, response);
        })
        .catch(function(error) {
          logger.error('getStatsImageEngine:Failed to retrieve data for domain ' + domainName);
          return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
//  ---------------------------------
/**
 * @name getMobileDesktopDistribution
 * @description method get data mobile/desktop distribution for a domain
 */
exports.getMobileDesktopDistribution = function(request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    metadataFilterField,
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
     var cacheKey = 'getMobileDesktopDistribution:' + domainID + ':' + JSON.stringify(queryProperties);
     multiCache.wrap(cacheKey, function() {
         isFromCache = false;
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
             oses: {
               terms: { field: 'os_name', size: 0 },
               aggs: {
                 devs: {
                   terms: { field: 'device', size: 30 }
                 }
               }
             },
             missing_oses: {
               missing: { field: 'os_name' },
               aggs: {
                 devs: {
                   terms: { field: 'device', size: 30 }
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

             var mobile = 0,
               desktop = 0,
               spiders = 0,
               unknown = 0;

             body.aggregations.oses.buckets.forEach(function(os) {
               desktop += os.doc_count - os.devs.sum_other_doc_count;
               mobile += os.devs.sum_other_doc_count;
               os.devs.buckets.forEach(function(dev) {
                 if (dev.key === 'Spider') {
                   spiders += dev.doc_count;
                 } else {
                   mobile += dev.doc_count;
                 }
                 desktop -= dev.doc_count;
               });
             });

             var missing = body.aggregations.missing_oses;
             unknown += missing.doc_count - missing.devs.sum_other_doc_count;
             mobile += missing.devs.sum_other_doc_count;
             missing.devs.buckets.forEach(function(dev) {
               if (dev.key === 'Spider') {
                 spiders += dev.doc_count;
               } else {
                 mobile += dev.doc_count;
               }
               unknown -= dev.doc_count;
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
                 filter: metadataFilterField
               },
               data: {
                 desktop: desktop,
                 mobile: mobile,
                 spiders: spiders,
                 unknown: unknown
               }
             };
             return response;
           });
       })
       .then(function(response) {
         if (isFromCache === true) {
           logger.info('getMobileDesktopDistribution:return cache for key - ' + cacheKey);
         }
         renderJSON(request, reply, error, response);
       })
       .catch(function(error) {
         logger.error('getMobileDesktopDistribution:Failed to retrieve data for domain ' + domainName);
         return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
       });
   } else {
     return reply(boom.badRequest('Domain ID not found'));
   }
 });
};

