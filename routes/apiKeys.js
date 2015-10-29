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
    method: 'GET',
    path: '/v1/api_keys/{key_id}',
    config: {
      auth: {
        scope: ['admin', 'reseller']
      },
      handler: apiKey.getApiKey,
      description: 'Get API key details',
      notes: 'Use this function to get details of and API key',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key_id: Joi.string().required().description('ID of the API key')
        }
      },
      response: {
        schema: routeModels.APIKeyModel
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
    path: '/v1/api_keys/{key_id}',
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
          key_id: Joi.string().required().description('ID of the API key to be updated')
        },
        payload: {
          key_name        : Joi.string().description('Name of the API key'),
          companyId       : Joi.string().description('ID of a company that the API key belongs to'),
          domains         : [{domainId: Joi.string().description('IDs of domains API key has access to')}],
          allowed_ops     : Joi.array().items({
            read_config     : Joi.boolean(),
            modify_config   : Joi.boolean(),
            delete_config   : Joi.boolean(),
            purge           : Joi.boolean(),
            reports         : Joi.boolean(),
            admin           : Joi.boolean(),
          }),
          read_only_status: Joi.boolean().description('Tells if API key can read only or read/write'),
          active          : Joi.boolean().description('Tells if API key active or not')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys/activate/{key_id}',
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
      validate: {
        params: {
          key_id: Joi.string().required().description('ID of the API key to be activated')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys/deactivate/{key_id}',
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
      validate: {
        params: {
          key_id: Joi.string().required().description('ID of the API key to be deactivated')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/api_keys/{key_id}',
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
          key_id: Joi.string().required().description('ID of the API key to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
