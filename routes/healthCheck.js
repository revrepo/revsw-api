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

"use strict";

var Joi = require('joi');

var healthCheck = require('../handlers/healthCheck');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/healthcheck',
    config: {
      auth: false,
      handler: healthCheck.healthCheck,
      description: 'Run a quick system health check ',
      tags: [],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  }
];
