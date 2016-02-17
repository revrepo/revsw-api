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
Joi.objectId = require('joi-objectid');

exports.listOfBillingPlanModels = Joi.array().items({
  id                    : Joi.objectId().description('Billing plan ID'),
  name                  : Joi.string().description('Billing plan name'),
  description           : Joi.string().description('Billing plan description'),
  type                  : Joi.string().valid('public', 'private').description('Type of the billing plan'),
  monthly_fee           : Joi.number().description('Monthly fee of the billing plan'),
  chargify_handle       : Joi.string().description('Product handler within EBS'),
  hosted_page           : Joi.string().description('Chargify hosted signup page'),
  services              : Joi.array().items(Joi.object({
    code_name             : Joi.string().description('Name of the service'),
    description           : Joi.string().description('Description of the service'),
    measure_unit          : Joi.string().description('Unit of the measurement for this service (e.g GB, $)'),
    cost                  : Joi.number().description('Cost of the service'),
    included              : Joi.number().description('Amount included in the service')
  })).description('List of the services of the billing plan'),

  prepay_discounts      : Joi.array().items(Joi.object({
    period                : Joi.number().description('The number of months after which this discount will be activated'),
    discount              : Joi.number().description('The actual discount (e.g. 20)')
  })).description('List of the prepay discounts of the billing plan'),

  commitment_discounts  : Joi.array().items(Joi.object({
    period                : Joi.number().description('The number of months after which this discount will be activated'),
    discount              : Joi.number().description('The actual discount (e.g. 20)')
  })).description('List of the long commitment discounts of the billing plan'),

  order                 : Joi.number().description('Order of Billing plan'),

  created_at            : Joi.date().description('API key creation date/time'),
  updated_at            : Joi.date().description('API key last update date/time')
}).meta({
  className: 'List of Billing plans'
});

exports.BillingPlanRequestPayload = {
  name                  : Joi.string().required().description('Billing plan name'),
  description           : Joi.string().required().description('Billing plan description'),
  type                  : Joi.string().valid('public', 'private').description('Type of the billing plan'),
  monthly_fee           : Joi.number().required().description('Monthly fee of the billing plan'),
  chargify_handle       : Joi.string().description('Product handler within EBS'),
  hosted_page           : Joi.string().description('Chargify hosted signup page'),
  services              : Joi.array().items({
    code_name             : Joi.string().description('Name of the service'),
    description           : Joi.string().description('Description of the service'),
    measure_unit          : Joi.string().description('Unit of the measurement for this service (e.g GB, $)'),
    cost                  : Joi.number().description('Cost of the service'),
    included              : Joi.number().description('Amount included in the service')
  }).description('List of the services of the billing plan'),

  prepay_discounts      : Joi.array().items({
    period                : Joi.number().description('The number of months after which this discount will be activated'),
    discount              : Joi.number().description('The actual discount (e.g. 20)')
  }).description('List of the prepay discounts of the billing plan'),

  commitment_discounts  : Joi.array().items({
    period                : Joi.number().description('The number of months after which this discount will be activated'),
    discount              : Joi.number().description('The actual discount (e.g. 20)')
  }).description('List of the long commitment discounts of the billing plan'),

  order                 : Joi.number().description('Order of Billing plan'),
};

exports.BillingPlanModel = Joi.object({
  id                    : Joi.objectId().description('Billing plan ID'),
  name                  : Joi.string().description('Billing plan name'),
  description           : Joi.string().description('Billing plan description'),
  type                  : Joi.string().valid('public', 'private').description('Type of the billing plan'),
  monthly_fee           : Joi.number().description('Monthly fee of the billing plan'),
  chargify_handle       : Joi.string().description('Product handler within EBS'),
  hosted_page           : Joi.string().description('Chargify hosted signup page'),
  services              : Joi.array().items(Joi.object({
    code_name             : Joi.string().description('Name of the service'),
    description           : Joi.string().description('Description of the service'),
    measure_unit          : Joi.string().description('Unit of the measurement for this service (e.g GB, $)'),
    cost                  : Joi.number().description('Cost of the service'),
    included              : Joi.number().description('Amount included in the service')
  })).description('List of the services of the billing plan'),

  prepay_discounts      : Joi.array().items(Joi.object({
    period                : Joi.number().description('The number of months after which this discount will be activated'),
    discount              : Joi.number().description('The actual discount (e.g. 20)')
  })).description('List of the prepay discounts of the billing plan'),

  commitment_discounts  : Joi.array().items(Joi.object({
    period                : Joi.number().description('The number of months after which this discount will be activated'),
    discount              : Joi.number().description('The actual discount (e.g. 20)')
  })).description('List of the long commitment discounts of the billing plan'),

  order                 : Joi.number().description('Order of Billing plan'),
  deleted               : Joi.boolean().description('Deleted flag'),
  history               : Joi.array().items(Joi.object()).description('array of previous version it’s saved after each change'),
  overage_credit_limit  : Joi.object().description('Overage credit limit'),

  created_at            : Joi.date().description('API key creation date/time'),
  updated_at            : Joi.date().description('API key last update date/time')
}).meta({
  className: 'Billing plan'
});
