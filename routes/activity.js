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

var auditInfo = require('../handlers/activity');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/activity',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: auditInfo.getDetailedAuditInfo,
      description: 'Detailed audit reports',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          user_id: Joi.objectId().description('User ID'),
          account_id: Joi.objectId().description('Account ID'),
          from_timestamp: Joi.string().max(50).description('Report period start timestamp (defaults to one month ago from now)'),
          to_timestamp: Joi.string().max(50).description('Report period end timestamp (defaults to now)'),
          target_type: Joi.string().valid('user', 'account', 'domain', 'purge', 'object', 'apikey', 'team', 'app', 'sslcert', 'sslname').description('Target type'),
          target_id: Joi.objectId().description('Target ID')
            .when('target_type', { is: 'user', then: Joi.required() })
            .when('target_type', { is: 'account', then: Joi.required() })
            .when('target_type', { is: 'domain', then: Joi.required() })
            .when('target_type', { is: 'purge', then: Joi.required() })
            .when('target_type', { is: 'object', then: Joi.required() })
            .when('target_type', { is: 'apikey', then: Joi.required() })
            .when('target_type', { is: 'team', then: Joi.required() })
            .when('target_type', { is: 'app', then: Joi.required() })
            .when('target_type', { is: 'sslcert', then: Joi.required() })
            .when('target_type', { is: 'sslname', then: Joi.required() })
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/activity/summary',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: auditInfo.getSummaryAuditInfo,
      description: 'Summary audit reports',
      tags: [],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          user_id: Joi.objectId().description('User ID'),
          account_id: Joi.objectId().description('Account ID'),
          from_timestamp: Joi.string().max(50).description('Report period start timestamp (defaults to one month ago from now)'),
          to_timestamp: Joi.string().max(50).description('Report period end timestamp (defaults to now)')
        }
      }
    }
  }
];
