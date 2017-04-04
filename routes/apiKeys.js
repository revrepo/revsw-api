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
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: apiKey.getApiKeys,
      description: 'Get a list of API keys registered for a company',
      notes: 'Use this function to get a list of API keys registered on your company account',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate:{
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().trim().description('ID of a company')
          })
         .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.listOfAPIKeysModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/api_keys/myself',
    config: {
      validate: {
        options: {
          stripUnknown: true
        }
      },
      auth: {
        scope: ['apikey']
      },
      handler: apiKey.getMyApiKey,
      description: 'Get your API key information',
      notes: 'Use the call to get the details of your API key.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.APIKeyModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/api_keys/{key_id}',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: apiKey.getApiKey,
      description: 'Get API key details',
      notes: 'Use this function to get details of an API key',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key_id: Joi.objectId().required().description('ID of the API key')
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
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: apiKey.createApiKey,
      description: 'Create a new API key',
      notes: 'Use the call to create a new API key for your company. ' +
        'After creating a new API key you can use a PUT call to /v1/api_keys/{key_id} to configure the key.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          account_id      : Joi.objectId().required().trim().description('ID of a company the new API key should be created for'),
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
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: apiKey.updateApiKey,
      description: 'Update a customer API key',
      notes: 'Use this function to update API key details',
      tags: ['api'],
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
          key_id: Joi.string().required().description('ID of the API key to be updated')
        },
        payload: {
          key_name        : Joi.string().required().regex(routeModels.apiKeyNameRegex).min(1).max(150).description('Name of the API key'),
          account_id      : Joi.objectId().required().description('ID of a company that the API key belongs to'),
          managed_account_ids : Joi.array().optional().items(Joi.objectId().description('IDs of companies the API key is allowed to manage')),
          domains         : Joi.array().required().items(Joi.objectId().description('IDs of web domains the API key is allowed to manage')),
          allowed_ops     : Joi.object({
            read_config     : Joi.boolean().required(),
            modify_config   : Joi.boolean().required(),
            delete_config   : Joi.boolean().required(),
            purge           : Joi.boolean().required(),
            reports         : Joi.boolean().required(),
            admin           : Joi.boolean().required(),
          }),
          read_only_status: Joi.boolean().required().description('Tells if the API key is read-only or read/write'),
          active          : Joi.boolean().required().description('Tells if the API key is active or not')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys/{key_id}/activate',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: apiKey.activateApiKey,
      description: 'Activate an API key',
      notes: 'Use the call to activate an API key for your company in the system',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key_id: Joi.objectId().required().description('ID of the API key to be activated')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/api_keys/{key_id}/deactivate',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: apiKey.deactivateApiKey,
      description: 'Deactive an API key',
      notes: 'Use the call to deactivate an API key. The key\' configuration will be stored in the system but it will be not ' +
        'possible to use the key to access the customer API service',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key_id: Joi.objectId().required().description('ID of the API key to be deactivated')
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
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: apiKey.deleteApiKey,
      description: 'Delete a customer API key',
      notes: 'This function should be used by a company admin to delete an API key',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          key_id: Joi.objectId().required().description('ID of the API key to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
