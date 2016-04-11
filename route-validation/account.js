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

var joi = require('joi');
joi.objectId = require('joi-objectid');
var routeModels = require('../lib/routeModels');

exports.accountUpdatePayload = {
  companyName: joi.string().required().regex(routeModels.companyNameRegex).min(1).max(150)
    .trim().description('Company name of newly registered customer account'),
  comment: joi.string().allow('').max(300).trim().description('Free-text comment about the company'),
  first_name: joi.string().optional().description('First name of contact person'),
  last_name: joi.string().optional().description('Last name of contact person'),
  phone_number: joi.string().description('Phone number').optional(),
  contact_email: joi.string().description('Contact email').optional(),
  password: joi.string().description('Password').optional(),
  address1: joi.string().description('Address 1').optional(),
  address2: joi.string().description('Address 2').optional(),
  country: joi.string().description('Country').optional(),
  state: joi.string().description('State').optional(),
  city: joi.string().description('City').optional(),
  zipcode: joi.string().description('Zip Code').optional(),
  billing_plan: joi.string().description('Billing plan ID'),
  use_contact_info_as_billing_info: joi.boolean().description('Use contact info as billing info'),
  billing_info: joi.object().optional().description('Billing information for create Chargify Customer Account'),
  subscription_state: joi.string().description('Subscription state (status)')
};
