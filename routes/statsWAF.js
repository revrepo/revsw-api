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
var getStatsWAF = require('../handlers/getStatsWAF');
var getTopObjects = require('../handlers/getTopObjectsWAF');
var getTopReports = require('../handlers/getTopReportsWAF');


var routeModels = require('../lib/routeModels');

var commonQueryParamsStatsWAF = {
  from_timestamp: Joi.string().description('Report period start timestamp'),
  to_timestamp: Joi.string().description('Report period end timestamp'),
  country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
  rule_id: Joi.number().integer().min(0).max(100000).description('WAF Internal Rule ID'),
  zone: Joi.string().valid('ARGS', 'HEADERS', 'BODY', 'URL')
    .description('Request Zone value to filter')
};
var paginationParams = {
  page: Joi.number().integer().min(1).max(100000).default(1).description('Page number'),
  count: Joi.number().integer().min(0).max(200).default(25).description('Count records'),
};
module.exports = [{
    method: 'GET',
    path: '/v1/stats/waf/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getStatsWAF.getStatsWAF,
      description: 'Get time-series report of WAF events for a domain',
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
        query: commonQueryParamsStatsWAF
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/stats/waf/top_objects/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getTopObjects.getTopObjectsWAF,
      description: 'Get a list of most WAF-active URLs or attacker IP addresses',
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
          report_type: Joi.string().required().valid('uri', 'ip')
            .description('Type of requested report (defaults to "country")'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter')
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/stats/waf/top/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getTopReports.getTopReportsWAF,
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
          report_type: Joi.string().required().valid('country', 'rule_id', 'zone')
            .description('Type of requested report (defaults to "country")'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter')
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/stats/waf/events/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getStatsWAF.getWAFEventsList,
      description: 'Get a list of raw WAF events for a domain',
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
        query: _.merge(paginationParams, commonQueryParamsStatsWAF)
      }
    }
  }
];
