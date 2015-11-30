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
var sdkConfig = require('../handlers/sdkConfigs');
var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/sdk/config/{sdk_key}',
    config: {
      auth: false,
      handler: sdkConfig.getSDKConfig,
      description: 'Get SDK configuration details',
      notes: 'Use this function to get details of an SDK configuration',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          sdk_key: Joi.string().trim().length(36).required().description('SDK key')
        }
      },
      response: {
        schema: routeModels.SDKConfigModel
      }
    }
  }
];
