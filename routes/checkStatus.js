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

var purges = require('../handlers/purges');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'POST',
    path: '/checkStatus',
    config: {
      handler: purges.getPurgeJobStatus_v0,
      auth: false,
      description: 'Get the status of a previously submitted purge request - obsolete API version',
      notes: 'Use the call to check the status of a previously submitted object purge request submitted via /purge API end point (obsolete API call).',
      tags: ['api', 'purge'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          req_id: Joi.string().trim().length(36)
            .required()
            .description('The ID of previously submitted purge request')
        }
      },
      response: {
        schema: routeModels.purgeStatusModel_v0
      }
    }
  }
];
