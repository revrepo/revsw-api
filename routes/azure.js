/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

/*
  This file describes API end-points used in Azure Marketplace integration
*/

'use strict';

var Joi = require('joi');

var azure = require('../handlers/azure');

var routeModels = require('../lib/routeModels');

module.exports = [

  // Subscription Operation
  {
    method: 'PUT',
    path: '/providers/RevAPM/subscriptions/{subscription_id}',
    config: {
      handler: azure.createSubscription,
      description: 'Create a new Azure Marketplace subscription',
      notes: 'Create a new Azure Marketplace subscription',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID')
        },
        payload: {
          RegistrationDate: Joi.string().required().trim(),
          state: Joi.string().required().valid('Registered', 'Suspended', 'Deleted', 'Unregistered', 'Warned'),
          properties: Joi.object().allow(null)
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Create/Update Resource
  {
    method: 'PUT',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}',
    config: {
      handler: azure.createUpdateResource,
      description: 'Create or update a resource',
      notes: 'Create or update a resource',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        },
        payload: {
          location: Joi.string().required().trim(),
          id: Joi.string().required().trim(),
          name: Joi.string().required().trim(),
          type: Joi.string().required().trim(),
          plan: Joi.object({
            name: Joi.string().required().valid('developer', 'silver', 'bronze', 'gold'),
            publisher: Joi.string().required().valid('RevAPM'),
            product: Joi.string().required().valid('accounts'),
            promotioncode: Joi.string().required().allow(null)  
          }),
          tags: Joi.object().allow(null),
          properties: Joi.object()
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Update (PATCH) a Resource
  {
    method: 'PATCH',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}',
    config: {
      handler: azure.patchResource,
      description: 'Patch a resource',
      notes: 'Patch a resource',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Get All Resources in Resource Group
  {
    method: 'GET',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts',
    config: {
      handler: azure.listAllResourcesInResourceGroup,
      description: 'Get all resources in a Resource Group',
      notes: 'Get all resources in Resource Group',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Get All Resources in Subscription
  {
    method: 'GET',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/providers/RevAPM/accounts',
    config: {
      handler: azure.listAllResourcesInSubscription,
      description: 'Get all resources in a Subscription',
      notes: 'Get all resources in a Subscription',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Get a Resource
  {
    method: 'GET',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}',
    config: {
      handler: azure.getResource,
      description: 'Get a Resource',
      notes: 'Get a Resource',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Delete a Resource
  {
    method: 'DELETE',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}',
    config: {
      handler: azure.deleteResource,
      description: 'Delete a Resource',
      notes: 'Delete a Resource',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },


  // List Secrets
  {
    method: 'POST',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}/ListSecrets',
    config: {
      handler: azure.listSecrets,
      description: 'List secrets',
      notes: 'List secrets',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // List supported Operations
  {
    method: 'GET',
    path: '/providers/RevAPM/providers/RevAPM/{empty}/operations',
    config: {
      handler: azure.listOperations,
      description: 'List supported RP operations',
      notes: 'List supported RP operations',
      tags: ['api'],
      auth: false,
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        options: {
          stripUnknown: false
        },
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Update Communication Preference
  {
    method: 'POST',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/providers/RevAPM/UpdateCommunicationPreference',
    config: {
      handler: azure.updateCommunicationPreference,
      description: 'Update Communication Preference',
      notes: 'Update Communication Preference',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // List Communication Preference
  {
    method: 'POST',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/providers/RevAPM/{empty}/ListCommunicationPreference',
    config: {
      handler: azure.listCommunicationPreference,
      description: 'List Communication Preference',
      notes: 'List Communication Preference',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },


  // Regenerate Keys
  {
    method: 'POST',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}/RegenerateKey',
    config: {
      handler: azure.regenerateKey,
      description: 'Regenerate key',
      notes: 'Regenerate key',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // List Single Sign On Authorization
  {
    method: 'POST',
    path: '/providers/RevAPM/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/RevAPM/accounts/{resource_name}/listSingleSignOnToken',
    config: {
      handler: azure.listSingleSignOnToken,
      description: 'List SSO token',
      notes: 'List SSL token',
      tags: ['api'],
      auth: false,
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
          subscription_id: Joi.string().required().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().description('Azure Resource Group name'),
          resource_name: Joi.string().required().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

];

