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

var usageReport = require('../handlers/usageReports');
var routeModels = require('../lib/routeModels');
var dayRegEx = /20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/;

module.exports = [
  {
    method: 'GET',
    path: '/v1/usage_reports/{account_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: usageReport.getAccountReport,
      description: 'Get Usage Report for the Account',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID')
        },
        query: {
          from: Joi.string().regex(dayRegEx).description('Report period start date in YYYY-MM-DD format'),
          to: Joi.string().regex(dayRegEx).description('Report period end(inclusive) date in YYYY-MM-DD format'),
          extended: Joi.boolean().default(false).description('Report should contain 5min interval traffic data'),
          bandwidth: Joi.boolean().default(false).description('Count billable bandwidth data')
        }
      }
    }
  },



];
