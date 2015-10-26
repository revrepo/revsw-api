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

var apiKey = require('../handlers/apiKeys');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/api_keys',
    config: {
      auth: {
        scope: ['admin', 'reseller']
      },
      handler: apiKey.getApiKeys,
      description: 'Get a list of customer API keys registered for a company',
      notes: 'Use this function to get a list of API keys registered on your company account',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfAPIKeysModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw']
      },
      handler: apiKey.createApiKey,
      description: 'Create a new API key in the system',
      notes: 'As a customer use the call to create a new API key for your company in the system',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          companyId: Joi.string().required().trim().description('ID of a company that the API key is to be created for')
        }
      },
      response: {
        schema: routeModels.APIKeyStatusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/api_keys/{key}',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw']
      },
      handler: apiKey.updateApiKey,
      description: 'Update a customer API key',
      notes: 'Use this function to update details of an API key',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key: Joi.string().required().description('API key to be updated')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys/activate/{key}',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw']
      },
      handler: apiKey.activateApiKey,
      description: 'Make the API key active',
      notes: 'As a customer use the call to activate an API key for your company in the system',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys/deactivate/{key}',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw']
      },
      handler: apiKey.deactivateApiKey,
      description: 'Make the API key inactive',
      notes: 'As a customer use the call to deactivate an API key for your company in the system',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/api_keys/{key}',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw']
      },
      handler: apiKey.deleteApiKey,
      description: 'Remove a customer API key',
      notes: 'This function should be used by a company admin to delete an API key',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key: Joi.string().required().description('API key to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
