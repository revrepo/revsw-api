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

var Joi = require('joi');

var getStats = require('../handlers/getStats');
var getTopObjects = require('../handlers/getTopObjects');
var getTopReports = require('../handlers/getTopReports');
var RTTReports = require('../handlers/getRTTReports');
var GBTReports = require('../handlers/getGBTReports');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/stats/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: getStats.getStats,
      description: 'Get traffic stats for a domain',
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
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp'),
          to_timestamp: Joi.string().description('Report period end timestamp'),
          status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
          cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
          request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
          protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
//        http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
          http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
            .description('HTTP method value to filter'),
          quic: Joi.string().valid( 'QUIC', 'HTTP' ).description('Last mile protocol to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/top_objects/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: getTopObjects.getTopObjects,
      description: 'Get a list of top object requests for a domain',
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
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of top objects to report (default to 30)'),
          status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
          cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
          request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
          protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
//        http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
          http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
            .description('HTTP method value to filter'),
          quic: Joi.string().valid( 'QUIC', 'HTTP' ).description('Last mile protocol to filter'),
          http2: Joi.string().valid( 'h2', 'h2c' ).description('HTTP2 protocol type to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/top/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: getTopReports.getTopReports,
      description: 'Get a list of top traffic properties for a domain',
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
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().required().valid ( 'referer', 'status_code', 'cache_status', 'content_type', 'protocol', 'request_status',
            'http_protocol', 'http_method', 'content_encoding', 'os', 'device', 'country', 'QUIC', 'http2', 'top5xx' ).description('Type of requested report (defaults to "referer")'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/lastmile_rtt/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: RTTReports.getRTTReports,
      description: 'Get RTT stats for a domain',
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
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().valid ( 'country', 'device', 'os' ).description('Type of requested report (defaults to "country")'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/gbt/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: GBTReports.getGBTReports,
      description: 'Get GBT stats for a domain',
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
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().valid ( 'country', 'device', 'os' ).description('Type of requested report (defaults to "country")'),
        }
      }
    }
  }

];
