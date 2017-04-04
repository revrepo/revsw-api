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

var Joi = require('joi');

var routeModels = require('../models');
var ROUTE_IDS = require('../ids');

module.exports = [
  {
    method: 'GET',
    path: '/v1/healthcheck',
    config: {
      auth: false,
      id: ROUTE_IDS.HEALTH_CHECK.GET.ALL,
      description: 'Run a quick system health check ',
      tags: [],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: Joi.object({
        message: Joi.string(),
        version: Joi.string()
      })
    }
  }
];
