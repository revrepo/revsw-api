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

var maxTimePeriodForWAFGraphsDays = config.get('max_time_period_for_waf_graphs_days');
var maxmind = require('../services/maxmind');
//
// Handler for Top Objects report WAF
//

exports.getTopObjectsWAF = function (request, reply) {

  var domainID = request.params.domain_id;
  var domainName,
    metadataFilterField;

  domainConfigs.get(domainID, function (error, domainConfig) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }
    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {

      domainName = domainConfig.domain_name;
      var span = utils.query2Span(request.query, 1 /*def start in hrs*/, 24 * maxTimePeriodForWAFGraphsDays /*allowed period - max count days*/);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }

      metadataFilterField = elasticSearch.buildMetadataFilterString(request);

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
              field: request.query.report_type, // NOTE:  'uri' or 'ip'
              size: request.query.count || 30,
              order: {
                _count: 'desc'
              }
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

      var indicesList = utils.buildIndexList(span.start, span.end, 'naxsi-');
      elasticSearch.getClient().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      }).then(function (body) {
        if (!body.aggregations) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName));
        }
        var dataArray = [];
        var ispinfo;
        var cityinfo;
        var countryinfo;

        for (var i = 0; i < body.aggregations.results.buckets.length; i++) {
          var ipregex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
          if (ipregex.test(body.aggregations.results.buckets[i].key)) {
            var ip = body
              .aggregations
              .results
              .buckets[i]
              .key;

            ispinfo = maxmind.getISP(ip);
            cityinfo = maxmind.getCity(ip);
            countryinfo = maxmind.getCountry(ip);
            dataArray[i] = {
              key: body.aggregations.results.buckets[i].key,
              count: body.aggregations.results.buckets[i].doc_count,
              country: countryinfo,
              city: cityinfo,
              isp: ispinfo,
            };
          } else {
            dataArray[i] = {
              key: body.aggregations.results.buckets[i].key,
              count: body.aggregations.results.buckets[i].doc_count
            };
          }
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
      }, function (error) {
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};
