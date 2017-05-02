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
var _ = require('lodash');
var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch = require('../lib/elasticSearch');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

//  ---------------------------------
var topReportsWAF_ = function (req, reply, domainConfig, span) {

  req.query.report_type = req.query.report_type || 'referer';
  var domainName = domainConfig.domain_name,
    field;

  switch (req.query.report_type) {
    case 'country':
      field = 'country'; //'geoip.country_code2';
      break;
    case 'zone':
      field = 'zone';
      break;
    case 'rule_id':
      field = 'id';
      break;
    default:
      return reply(boom.badImplementation('Received bad report_type value ' + req.query.report_type));
  }

  var requestBody = {
    query: {
      filtered: {
        filter: {
          bool: {
            must: [{
              range: {
                'date': {
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
          size: req.query.count || 30,
          order: {
            _count: 'desc'
          }
        }
      },
      missing_field: {
        missing: {
          field: field
        }
      }
    }
  };

  //  add 2 sub-aggregations for country
  if (req.query.report_type === 'country') {
    requestBody.aggs.results.aggs = {
      regions: {
        terms: {
          field: 'country', // 'geoip.region_name',
          size: 0
        }
      },
      missing_regions: {
        missing: {
          field: 'country' // 'geoip.region_name',
        }
      }
    };
  }

  //  update query
  elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, req, domainConfig);
  // NOTE: change property name for NAXSI
  _.forEach(requestBody.query.filtered.filter.bool.must, function (itemMust) {
    if (!!itemMust.terms) {
      itemMust.terms.server = _.clone(itemMust.terms.domain);
      delete itemMust.terms.domain;
    }
  });
  var indicesList = utils.buildIndexList(span.start, span.end, 'naxsi-');
  return elasticSearch.getClient().search({
      index: indicesList,
      ignoreUnavailable: true,
      timeout: config.get('elasticsearch_timeout_ms'),
      body: requestBody
    })
    .then(function (body) {
      if (!body.aggregations) {
        return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
          ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName));
      }

      var data = body.aggregations.results.buckets.map(function (res) {
        var item = {
          key: res.key,
          count: res.doc_count,
        };
        if (res.regions && res.regions.buckets.length) {
          item.regions = res.regions.buckets.map(function (region) {
            return {
              key: region.key,
              count: region.doc_count,
            };
          });
        }
        if (res.missing_regions && res.missing_regions.doc_count) {
          if (!item.regions) {
            item.regions = [];
          }
          var region = res.missing_regions;
          item.regions.push({
            key: '--',
            count: region.doc_count,
          });
        }
        return item;
      });

      if (body.aggregations.missing_field && body.aggregations.missing_field.doc_count) {
        var res = body.aggregations.missing_field;
        data.push({
          key: '--',
          count: res.doc_count,
        });
      }

      //  special treatment for cache report type to avoid garbage like "-" or just missing field
      // if (field === 'cache') {
      //   data = [{
      //     key: 'HIT',
      //     count: data.reduce(function (prev, curr) {
      //       return prev + (curr.key === 'HIT' ? curr.count : 0);
      //     }, 0)
      //   }, {
      //     key: 'MISS',
      //     count: data.reduce(function (prev, curr) {
      //       return prev + (curr.key !== 'HIT' ? curr.count : 0);
      //     }, 0)
      //   }];
      // }

      var response = {
        metadata: {
          domain_name: domainName,
          domain_id: req.params.domain_id,
          start_timestamp: span.start,
          start_datetime: new Date(span.start),
          end_timestamp: span.end,
          end_datetime: new Date(span.end),
          total_hits: body.hits.total,
          data_points_count: body.aggregations.results.buckets.length
        },
        data: data
      };
      // renderJSON(req, reply, error, response);
      renderJSON(req, reply, false /*error is undefined here*/ , response);
    })
    .catch(function (error) {
      return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
    });
};

/**
 * @name getTopReports
 * @desc method
 */
exports.getTopReports = function (request, reply) {

  var domainID = request.params.domain_id;

  domainConfigs.get(domainID, function (error, domainConfig) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }

    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {

      var span = utils.query2Span(request.query, 1 /*def start in hrs*/ , 30 * 24 /*allowed period in hrs*/ );
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }

      return topReportsWAF_(request, reply, domainConfig, span);

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
