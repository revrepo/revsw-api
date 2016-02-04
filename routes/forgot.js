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
    method : 'POST',
    path   : '/v1/forgot',
    config : {
      handler     : password.forgotPassword,
      auth        : false,
      description : 'An internal portal call to initiate a password reset process for a user',
//      tags        : ['api', 'web'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        payload : {
          email : Joi.string().email().required().description('Login name (email address) to start a password reset process for')
        }
      }
    }
  }
];
