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

var billingPlanHandler = require('../handlers/billingPlans');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/billing_plans',
    config: {
      auth: { mode: 'try'}, // @see https://hapijs.com/tutorials/auth#mode
      handler: billingPlanHandler.list,
      description: 'Get a list of Billing Plans registered in system',
      notes: 'Use this function to get a list of Billing Plans registered in system',
 //      tags: ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/billing_plans/{id}',
    config: {
      auth: false,
      //TODO: check bisness logick
      // {
      //   scope: ['admin_rw']
      // },
      handler: billingPlanHandler.get,
      description: 'Get Billing Plan details',
      notes: 'Use this function to get details of an Billing plan',
//      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          id: Joi.objectId().required().description('ID of the Billing plan')
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/billing_plans',
    config: {
      auth: {
        scope: ['admin_rw', 'revadmin_rw', 'revadmin']
      },
      handler: billingPlanHandler.createBillingPlan,
      description: 'Create a new Billing plan in the system',
      notes: 'Use the call to create a new Billing plan in system.',
//      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          name: Joi.string().required().description('Billing plan name'),
          description: Joi.string().required().description('Billing plan description'),
          type: Joi.string().valid('public', 'private').description('Type of the billing plan'),
          monthly_fee: Joi.number().required().description('Monthly fee of the billing plan'),
          chargify_handle: Joi.string().description('Product handler within EBS'),
          services: Joi.array().items({
            code_name: Joi.string().description('Name of the service'),
            description: Joi.string().description('Description of the service'),
            measurement_unit: Joi.string().description('Unit of the measurement for this service (e.g GB, $)'),
            cost: Joi.number().description('Cost of the service'),
            included: Joi.number().description('Amount included in the service'),
            type: Joi.string().description('Component type in Chargify'),
            billing_id: Joi.number().description('Services id in Chargify')
          }).description('List of the services of the billing plan'),

          prepay_discounts: Joi.array().items({
            period: Joi.number().description('The number of months after which this discount will be activated'),
            discount: Joi.number().description('The actual discount (e.g. 20)')
          }).description('List of the prepay discounts of the billing plan'),

          commitment_discounts: Joi.array().items({
            period: Joi.number().description('The number of months after which this discount will be activated'),
            discount: Joi.number().description('The actual discount (e.g. 20)')
          }).description('List of the long commitment discounts of the billing plan'),

          order: Joi.number().description('Order of Billing plan')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/billing_plans/{id}',
    config: {
      auth: {
        scope: ['admin_rw']
      },
      handler: billingPlanHandler.updateBillingPlan,
      description: 'Update a Billing plan',
      notes: 'Use this function to update Billing plan details',
//      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        options: {
          stripUnknown: false
        },
        params: {
          id: Joi.string().required().description('ID of the Billing plan to be updated')
        },
        payload: {
          name: Joi.string().required().description('Billing plan name'),
          description: Joi.string().required().description('Billing plan description'),
          type: Joi.string().valid('public', 'private').description('Type of the billing plan'),
          monthly_fee: Joi.number().required().description('Monthly fee of the billing plan'),
          chargify_handle: Joi.string().description('Product handler within EBS'),
          services: Joi.array().items({
            code_name: Joi.string().description('Name of the service'),
            description: Joi.string().description('Description of the service'),
            measurement_unit: Joi.string().description('Unit of the measurement for this service (e.g GB, $)'),
            cost: Joi.number().description('Cost of the service'),
            included: Joi.number().description('Amount included in the service'),
            type: Joi.string().description('Component type in Chargify'),
            billing_id: Joi.number().description('Services id in Chargify')
          }).description('List of the services of the billing plan'),

          prepay_discounts: Joi.array().items({
            period: Joi.number().description('The number of months after which this discount will be activated'),
            discount: Joi.number().description('The actual discount (e.g. 20)')
          }).description('List of the prepay discounts of the billing plan'),

          commitment_discounts: Joi.array().items({
            period: Joi.number().description('The number of months after which this discount will be activated'),
            discount: Joi.number().description('The actual discount (e.g. 20)')
          }).description('List of the long commitment discounts of the billing plan'),

          order: Joi.number().description('Order of Billing plan')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/billing_plans/{id}',
    config: {
      auth: {
        scope: ['admin_rw']
      },
      handler: billingPlanHandler.delete,
      description: 'Remove a billing plan',
      notes: 'This function should be used by a admin to delete an Billing plan',
//      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          id: Joi.objectId().required().description('ID of the Billing plan to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
