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

var usageReports = require('../handlers/usageReports');
var routeModels = require('../lib/routeModels');

module.exports = [{
  method: 'GET',
  path: '/v1/usage_reports/web',
  config: {
    auth: {
      scope: ['admin', 'reseller', 'revadmin', 'apikey']
    },
    handler: usageReports.getAccountReport,
    description: 'Get Usage Report for an Account(s)',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      params: {},
      query: {
        account_id: Joi.objectId().allow('').default('').description('Account ID, optional'),
        from: Joi.string().regex(routeModels.dateRegex).description('Report period start date in YYYY-MM-DD format'),
        to: Joi.string().regex(routeModels.dateRegex).description('Report period end(inclusive) date in YYYY-MM-DD format'),
        only_overall: Joi.boolean().default(true).description('Report should contain only overall summary, default true'),
        keep_samples: Joi.boolean().default(false).description('Report should contain 5min interval traffic data, default false'),
        agg: Joi.boolean().optional('Get an aggregated report for all child accounts')
      }
    }
  }
}, {
  method: 'GET',
  path: '/v1/usage_reports/web/stats',
  config: {
    auth: {
      scope: ['admin', 'reseller', 'revadmin', 'apikey']
    },
    handler: usageReports.getAccountStats,
    description: 'Get Usage Date Histogram for an Account(s)',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      params: {},
      query: {
        account_id: Joi.objectId().allow('').default('').description('Account ID, optional'),
        from_timestamp: Joi.number().unit('milliseconds').description('Report period start timestamp (defaults to 24 hours ago from now)'),
        to_timestamp: Joi.number().unit('milliseconds').description('Report period end timestamp (defaults to now)'),
        agg: Joi.boolean().optional('Get an aggregated report for all child accounts')
      }
    }
  }
},

{
  method: 'GET',
  path: '/v1/usage_reports/web/generate',
  config: {
    auth: {
      scope: ['admin', 'reseller', 'revadmin', 'apikey']
    },
    handler: usageReports.generateAccountReport,
    description: 'Generate a Usage Report for an Account(s)',
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      params: {},
      query: {
        account_id: Joi.objectId().allow('').default('').description('Account ID, optional'),
      }
    }
  }
},

{
  method: 'GET',
  path: '/v1/usage_reports/export_csv',
  config: {
    auth: {
      scope: ['admin', 'reseller', 'revadmin', 'apikey']
    },
    handler: usageReports.exportCSVReport,
    description: 'Create a CSV report for a usage report',
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      params: {},
      query: {
        account_id: Joi.objectId().allow('').default('').description('Account ID, optional'),
        from: Joi.string().regex(routeModels.dateRegex).description('Report period start date in YYYY-MM-DD format'),
        to: Joi.string().regex(routeModels.dateRegex).description('Report period end(inclusive) date in YYYY-MM-DD format'),
      }
    }
  }
}

];
