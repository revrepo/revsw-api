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

var auditInfo = require('../handlers/auditInfo');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/activity',
    config: {
      auth: {
        strategy: 'simple',
        scope: [ 'user', 'admin', 'reseller' ]
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
          user_id: Joi.string().description('User ID'),
          domain_id: Joi.string().description('Domain ID'),
          company_id: Joi.string().description('Company ID'),
          from_timestamp: Joi.number().integer().min(1).description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.number().integer().min(2).description('Report period end timestamp (defaults to now)'),
          operation_status: Joi.string().valid ('success','failure').description('Type of operation')
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/activity/summary',
    config: {
      auth: {
        strategy: 'simple',
        scope: [ 'user', 'admin', 'reseller' ]
      },
      handler: auditInfo.getSummaryAuditInfo,
      description: 'Summary audit reports',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          user_id: Joi.string().description('User ID'),
          domain_id: Joi.string().description('Domain ID'),
          company_id: Joi.string().description('Company ID'),
          from_timestamp: Joi.number().integer().min(1).description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.number().integer().min(2).description('Report period end timestamp (defaults to now)'),
        }
      }
    }
  }
];
