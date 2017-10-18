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

var boom = require('boom');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;
var _ = require('lodash');
var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch = require('../lib/elasticSearch');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var maxTimePeriodForWAFGraphsDays = config.get('max_time_period_for_waf_graphs_days');
var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
  store: 'memory',
  max: config.get('cache_memory_max_bytes'),
  ttl: config.get('cache_memory_ttl_seconds')/*seconds*/,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);
var maxmind = require('../services/maxmind');
//
// Get traffic stats for WAF
//

//  ---------------------------------
exports.getStatsWAF = function (request, reply) {

  var domainID = request.params.domain_id,
    domainName,
    metadataFilterField,
    isFromCache = true,
    queryProperties = _.clone(request.query);
  // NOTE: make correction for the time range
  _.merge(queryProperties, utils.roundTimestamps(request.query, 5));

  domainConfigs.get(domainID, function (error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {
      domainName = domainConfig.domain_name;

      var span = utils.query2Span(request.query, 24 /*def start in hrs*/, 24 * maxTimePeriodForWAFGraphsDays /*allowed period - max count days*/);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      // NOTE: change start time for make correction graphs for shift all values
      var startTimeValue_ = span.start - span.interval;
      var cacheKey = 'getStatsWAF:' + domainID + ':' + JSON.stringify(queryProperties);
      multiCache.wrap(cacheKey, function () {
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
                      'date': {
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
                field: 'date',
                interval: ('' + span.interval),
                min_doc_count: 0,
                extended_bounds: {
                  min: startTimeValue_,
                  max: span.end
                },
                offset: ('' + (span.end % span.interval))
              }
            }
          }
        };
        //  update query special for NAXSI data
        elasticSearch.buildESQueryTermsForNaxsi(requestBody.query.filtered.filter.bool, request, domainConfig);
        // NOTE: fix term name for NAXSI
        _.forEach(requestBody.query.filtered.filter.bool.must, function (itemMust) {
          if (!!itemMust.terms) {
            itemMust.terms.server = _.clone(itemMust.terms.domain);
            delete itemMust.terms.domain;
          }
        });

        return elasticSearch.getClient().search({
          index: utils.buildIndexList(startTimeValue_, span.end, 'naxsi-'),
          ignoreUnavailable: true,
          timeout: config.get('elasticsearch_timeout_ms'),
          body: requestBody
        })
          .then(function (body) {

            var dataArray = [];
            // NOTE: i equal "1" for apply action "shift all values"
            for (var i = 1, len = body.aggregations.results.buckets.length; i < len; i++) {
              var itemTime = body.aggregations.results.buckets[i];
              var itemData = body.aggregations.results.buckets[i - 1];
              dataArray.push({
                time: itemTime.key,
                requests: itemData.doc_count
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
        .then(function (response) {
          if (isFromCache === true) {
            logger.info('getStatsWAF:return cache for key - ' + cacheKey);
          }
          renderJSON(request, reply, error, response);
        })
        .catch(function (error) {
          logger.error('getStatsWAF:Failed to retrieve data for domain ' + domainName);
          return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

/**
 * @name getWAFEventsList
 * @desc method get list waf events
 *
 */
exports.getWAFEventsList = function (request, reply) {
  var domainID = request.params.domain_id,
    domainName,
    metadataFilterField;
  var pageSize = request.query.count || 25;
  var pageNumber = request.query.page || 1;
  var sortBy = request.query.sortBy || 'date';
  var sortDirection = request.query.sortDirection || '-1';
  domainConfigs.get(domainID, function (error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {
      domainName = domainConfig.domain_name;

      var span = utils.query2Span(request.query, 24 /*def start in hrs*/, 24 * maxTimePeriodForWAFGraphsDays /*allowed period - max count days*/);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }

      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

      var requestBody = {
        size: pageSize,
        from: pageNumber * pageSize - pageSize,
        // TODO: add sort
        query: {
          filtered: {
            filter: {
              bool: {
                must: [{
                  range: {
                    'date': {
                      gte: span.start,
                      lt: span.end
                    }
                  }
                }]
              }
            }
          }
        }
      };
      if (!!sortBy && sortBy.length > 0) {
        requestBody.sort = [];
        var sortItem = {};
        sortItem['' + sortBy + ''] = { order: (sortDirection === '1') ? 'asc' : 'desc' };
        requestBody.sort.push(sortItem);
      }
      //  update query
      elasticSearch.buildESQueryTermsForNaxsi(requestBody.query.filtered.filter.bool, request, domainConfig);
      // NOTE: fix term name for NAXSI
      _.forEach(requestBody.query.filtered.filter.bool.must, function (itemMust) {
        if (!!itemMust.terms) {
          itemMust.terms.server = _.clone(itemMust.terms.domain);
          delete itemMust.terms.domain;
        }
      });

      elasticSearch.getClient().search({
        index: utils.buildIndexList(span.start, span.end, 'naxsi-'),
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      })
        .then(function (body) {
          var dataArray = [];
          var response = {
            metadata: {
              domain_name: domainName,
              domain_id: domainID,
              start_timestamp: span.start,
              start_datetime: new Date(span.start),
              end_timestamp: span.end,
              end_datetime: new Date(span.end),
              total: body.hits.total,
              filter: metadataFilterField
            },
            data: _.map(body.hits.hits, function (item) {
              item._source.isp = maxmind.getISP(item._source.ip);              
              item._source.city = maxmind.getCity(item._source.ip);              
              item._source.countryByIp = maxmind.getCountry(item._source.ip);
              return item._source;
            })
          };
          renderJSON(request, reply, error, response);
        }, function (error) {
          return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
        });
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
