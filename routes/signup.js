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

module.exports = [
  {
    method: 'POST',
    path: '/v1/signup',
    config: {
      handler: handler.signup,
      auth: false,
      description: 'An internal portal call for user signup',
//      tags        : ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          first_name: Joi.string().min(1).max(150).trim().description('User first name').required(),
          last_name: Joi.string().min(1).max(150).trim().description('Last name').required(),
          email: Joi.string().email().description('Email address').required(),
          company_name: Joi.string().min(1).max(150).allow('').trim().description('Company name').optional(),
          phone_number: Joi.string().min(1).max(30).trim().description('Phone number').required(),
          password: Joi.string().min(8).max(15).description('Password').required(),
          passwordConfirm: Joi.string().min(8).max(15).description('Password confirmation').required(),
          address1: Joi.string().min(1).max(150).trim().description('Address 1').required(),
          address2: Joi.string().min(1).max(150).allow('').trim().description('Address 2').optional(),
          country: Joi.string().min(1).max(150).trim().description('Country').required(),
          state: Joi.string().min(1).max(150).trim().description('State').required(),
          city: Joi.string().min(1).max(150).trim().description('City').required(),
          zipcode: Joi.string().min(1).max(30).trim().description('Zip Code').required(),
          billing_plan: Joi.string().min(1).max(150).trim().description('Billing plan ID').required()
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/signup2',
    config: {
      handler: handler.signup2,
      auth: false,
      description: 'An internal portal call for user signup (short)',
//      tags        : ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          first_name: Joi.string().min(1).max(150).trim().description('User first name').required(),
          last_name: Joi.string().min(1).max(150).trim().description('Last name').required(),
          email: Joi.string().email().description('Email address').required(),
          // company_name: Joi.string().min(1).max(150).allow('').trim().description('Company name').optional(),
          // phone_number: Joi.string().min(1).max(30).trim().description('Phone number').required(),
          password: Joi.string().min(8).max(15).description('Password').required(),
          // passwordConfirm: Joi.string().min(8).max(15).description('Password confirmation').required(),
          // address1: Joi.string().min(1).max(150).trim().description('Address 1').required(),
          // address2: Joi.string().min(1).max(150).allow('').trim().description('Address 2').optional(),
          country: Joi.string().optional().min(1).max(150).trim().description('Country').required(),
          // state: Joi.string().min(1).max(150).trim().description('State').required(),
          // city: Joi.string().min(1).max(150).trim().description('City').required(),
          // zipcode: Joi.string().min(1).max(30).trim().description('Zip Code').required(),
          billing_plan: Joi.string().min(1).max(150).trim().description('Billing plan ID').required()
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/signup/resend/{email}',
    config: {
      handler: handler.resendRegistrationEmail,
      auth: false,
      description: 'An internal portal call for resend user registration email',
//      tags        : ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          email: Joi.string().email().required().description('Email to send registration email')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/signup/verify/{token}',
    config: {
      handler: handler.verify,
      auth: false,
      description: 'An internal portal call for user verification',
//      tags        : ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          token: Joi.string().trim().length(40).required().description('Verification token')
        }
      },
      response: {
        schema: routeModels.contactInfoModel
      }
    }
  }
];
