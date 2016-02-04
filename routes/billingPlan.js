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
var routeValidation = require('../route-validation/billingPlan');

module.exports = [
  {
    method: 'GET',
    path: '/v1/billing_plans',
    config: {
      auth: false,
      handler: billingPlanHandler.list,
      description: 'Get a list of Billing Plans registered in system',
      notes: 'Use this function to get a list of Billing Plans registered in system',
//      tags: ['api', 'web'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeValidation.listOfBillingPlanModels
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/billing_plans/{id}',
    config: {
      auth: {
        scope: ['admin_rw']
      },
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
      },
      response: {
        schema: routeValidation.BillingPlanModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/billing_plans',
    config: {
      auth: {
        scope: ['admin_rw']
      },
      handler: billingPlanHandler.create,
      description: 'Create a new Billing plan in the system',
      notes: 'Use the call to create a new Billing plan in system.',
//      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: routeValidation.BillingPlanRequestPayload
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
      handler: billingPlanHandler.update,
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
          stripUnknown: true
        },
        params: {
          id: Joi.string().required().description('ID of the Billing plan to be updated')
        },
        payload: routeValidation.BillingPlanRequestPayload
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
