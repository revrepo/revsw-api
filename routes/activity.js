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

module.exports = [{
  method: 'GET',
  path: '/v1/activity',
  config: {
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
    },
    handler: auditInfo.getDetailedAuditInfo,
    description: 'Get a detailed audit report of user activity',
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
        target_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).description('Target ID'),
        target_type: Joi.string().valid('group', 'user', 'account',
          'domain', 'object', 'apikey',
          'logshippingjob', 'app', 'sslcert',
          'sslname', 'dnszone', 'dnsrecord',
          'wafrule')
          .when('target_id', { is: /^[0-9a-fA-F]{24}$/, then: Joi.required() })
          .description('Target type  (\'user\', \'account\', \'domain\', \'object\', \'apikey\', \'logshippingjob\', \'app\', \'sslcert\', \'sslname\','+
          ' \'dnszone\',\'dnsrecord\',\'wafrule\''),
        activity_type: Joi.string().valid('login', 'add', 'modify', 'delete', 'publish', 'purge', 'init2fa', 'enable2fa',
          'disable2fa', 'resetpassword', 'signup', 'verify','verify_email')
            .description('Activity type (\'login\', \'add\', \'modify\', \'delete\', \'publish\', \'purge\','+
            ' \'init2fa\', \'enable2fa\', \'disable2fa\', \'resetpassword\', \'signup\', \'verify\', \'verify_email\')')
      }
    }
  }
}, {
  method: 'GET',
  path: '/v1/activity/summary',
  config: {
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
    },
    handler: auditInfo.getSummaryAuditInfo,
    description: 'Get a summarized audit report of user activity',
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
}];
