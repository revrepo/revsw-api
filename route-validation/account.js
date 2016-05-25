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
  first_name: joi.string().optional().min(1).max(150).trim().description('First name of contact person'),
  last_name: joi.string().optional().min(1).max(150).trim().description('Last name of contact person'),
  phone_number: joi.string().min(1).max(30).trim().description('Phone number').optional(),
  contact_email: joi.string().email().description('Contact email').optional(),
  address1: joi.string().min(1).max(150).trim().description('Address 1').optional(),
  address2: joi.string().min(1).max(150).trim().description('Address 2').optional().allow(''),
  country: joi.string().min(1).max(150).trim().description('Country').optional(),
  state: joi.string().min(1).max(150).trim().description('State').optional(),
  city: joi.string().min(1).max(150).trim().description('City').optional(),
  zipcode: joi.string().min(1).max(30).trim().description('Zip Code').optional(),
  // TODO: add proper  min/max restrictions for billing_plan
  billing_plan: joi.string().trim().description('Billing plan ID'),
  use_contact_info_as_billing_info: joi.boolean().description('Use contact info as billing info'),
  billing_info: joi.object().optional().description('Billing information for create Chargify Customer Account'),
  subscription_state: joi.string().min(1).max(30).trim().description('Subscription state (status)')
};

exports.accountDeletePayload = {
  cancellation_message: joi.string().optional().allow(null).trim().allow('').max(300).description('Free-text comment about reason delete the account'),
};
