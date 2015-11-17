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

'use strict';

var Joi = require('joi');

var handler = require('../handlers/signup');

var routeModels = require('../lib/routeModels');
var signupValidation = require('../route-validation/signup');

module.exports = [
  {
    method : 'POST',
    path   : '/v1/signup',
    config : {
      handler     : handler.signup,
      auth        : false,
      description : 'An internal portal call for user signup',
      tags        : ['api', 'web'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        payload : signupValidation.signupPayload
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method : 'GET',
    path   : '/v1/signup/resend/{email}',
    config : {
      handler     : handler.resetToken,
      auth        : false,
      description : 'An internal portal call for resend user verification',
      tags        : ['api', 'web'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        params: {
          tokemailen: Joi.string().email().required().description('Email to send verification')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }

  {
    method : 'GET',
    path   : '/v1/signup/verify/{token}',
    config : {
      handler     : handler.verify,
      auth        : false,
      description : 'An internal portal call for user verification',
      tags        : ['api', 'web'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        params: {
          token: Joi.string().trim().length(40).required().description('Verification token')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
