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

var authenticate = require('../handlers/authenticate');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method : 'POST',
    path   : '/v1/authenticate',
    config : {
      handler     : authenticate.authenticate,
      auth        : false,
      description : 'An internal portal call for user authentication',
//      tags        : ['api', 'web'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        payload : {
          email    : Joi.string().email().required().description('Login name (email address) to authenticate'),
          password : Joi.string().required().description('Password'),
          oneTimePassword: Joi.string().description('One Time Password - delivered by Google Authenticator'),
        }
      }
    }
  },

  {
    method : 'POST',
    path   : '/v1/authenticate-sso-azure',
    config : {
      handler     : authenticate.authenticateSSOAzure,
      auth        : false,
      description : 'An internal portal call for Azure SSO authentication',
//      tags        : ['api', 'web'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        payload : {
          token    : Joi.string().required().description('Encrypted and signed SSO token'),
          resourceId    : Joi.string().required().description('Base64-encoded resource ID')
        }
      }
    }
  }
];
