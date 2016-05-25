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

var password = require('../handlers/password');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/reset/{token}',
    config: {
      handler: password.checkPasswordResetToken,
      auth: false,
      description: 'An internal portal call to check the validity of a password reset token',
//      tags: ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          token: Joi.string().trim().length(40).required().description('Password reset token to verify')
        }
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/reset/{token}',
    config: {
      handler: password.resetPassword,
      auth: false,
      description: 'An internal portal call to reset password for a user',
//      tags: ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          token: Joi.string().trim().length(40).required().description('Password reset token to verify')
        },
        payload: {
          password: Joi.string().min(8).max(15).required().description('New password to set for the user')
        }
      }
    }
  }
];
