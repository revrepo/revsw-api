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

var Joi = require('joi');
var _ = require('lodash');
var getStats = require('../handlers/getStats');
var getTopObjects = require('../handlers/getTopObjectsWAF');
var getTopReports = require('../handlers/getTopReportsWAF');


var routeModels = require('../lib/routeModels');

var commonQueryParamsStatsImageEngine = {
  from_timestamp: Joi.string().description('Report period start timestamp'),
  to_timestamp: Joi.string().description('Report period end timestamp'),
  status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
  cache_code: Joi.string().valid('HIT', 'MISS').description('HTTP cache hit/miss status to filter'),
  request_status: Joi.string().valid('OK', 'ERROR').description('Request completion status to filter'),
  protocol: Joi.string().valid('HTTP', 'HTTPS').description('HTTP/HTTPS protocol to filter'),
  // http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
  http_method: Joi.string().valid('GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH')
    .description('HTTP method value to filter'),
  quic: Joi.string().valid('QUIC', 'HTTP').description('Last mile protocol to filter'),
  country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
  os: Joi.string().description('OS name/version to filter'),
  device: Joi.string().description('Device name/version to filter'),
  browser: Joi.string().description('Browser name to filter')
};

module.exports = [{
    method: 'GET',
    path: '/v1/stats/imageengine/saved_bytes/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getStats.getStatsImageEngine,
      description: 'Get time-series report of ImageEngine events for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: commonQueryParamsStatsImageEngine
      }
    }
  }

];
