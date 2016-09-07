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
var provider = 'RevAPM.MobileCDN';

module.exports = [

  // Get a list of subscriptions
  {
    method: 'GET',
    path: '/subscriptions',
    config: {
      handler: azure.listSubscriptions,
      description: 'Get a list of registered Subscriptionis',
      notes: 'Get a list of registred Subscriptions',
//      tags: ['api'],
      auth: {
        scope: ['revadmin']
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Subscription Operation
  {
    method: 'PUT',
    path: '/subscriptions/{subscription_id}',
    config: {
      handler: azure.createSubscription,
      description: 'Create a new Azure Marketplace subscription',
      notes: 'Create a new Azure Marketplace subscription',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID')
        },
        payload: {
          registrationDate: Joi.string().trim(),
          RegistrationDate: Joi.string().trim(),
          state: Joi.string().required().valid('Registered', 'Suspended', 'Deleted', 'Unregistered', 'Warned'),
          properties: Joi.object().allow(null)
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Create Resource
  {
    method: 'PUT',
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}',
    config: {
      handler: azure.createResource,
      description: 'Create a resource',
      notes: 'Create a resource',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
        },
        payload: {
          location: Joi.string().required().lowercase().trim(),
          id: Joi.string().trim(),
          name: Joi.string().required().trim(),
          type: Joi.string().required().trim(),
          plan: Joi.object({
            name: Joi.string().required().valid('free', 'developer', 'silver', 'bronze', 'gold'),
            publisher: Joi.string().required(),
            product: Joi.string().required(),
            promotioncode: Joi.string().allow(null)  
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
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}',
    config: {
      handler: azure.patchResource,
      description: 'Patch a resource',
      notes: 'Patch a resource',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
        },
        payload: {
          location: Joi.string().required().trim(),
          id: Joi.string().required().trim(),
          name: Joi.string().required().trim(),
          type: Joi.string().required().trim(),
          plan: Joi.object({
            name: Joi.string().required().valid('free', 'developer', 'silver', 'bronze', 'gold'),
            publisher: Joi.string().required(),
            product: Joi.string().required(),
            promotioncode: Joi.string().allow(null)
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

  // Get All Resources in Resource Group
  {
    method: 'GET',
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts',
    config: {
      handler: azure.listAllResourcesInResourceGroup,
      description: 'Get all resources in a Resource Group',
      notes: 'Get all resources in Resource Group',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
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
    path: '/subscriptions/{subscription_id}/providers/' + provider + '/accounts',
    config: {
      handler: azure.listAllResourcesInSubscription,
      description: 'Get all resources in a Subscription',
      notes: 'Get all resources in a Subscription',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
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
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}',
    config: {
      handler: azure.getResource,
      description: 'Get a Resource',
      notes: 'Get a Resource',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Move resources across groups/subscriptions - TODO: it is save to remove the route (it is not required)
  {
    method: 'POST',
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/moveResources',
    config: {
      handler: azure.moveResources,
      description: 'Move resources across groups/subscriptions',
      notes: 'Move resources across groups/subscriptions',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
        },
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },

  // Delete a Resource
  {
    method: 'DELETE',
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}',
    config: {
      handler: azure.deleteResource,
      description: 'Delete a Resource',
      notes: 'Delete a Resource',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
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
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}/listSecrets',
    config: {
      handler: azure.listSecrets,
      description: 'List secrets',
      notes: 'List secrets',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
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
    path: '/providers/' + provider + '/operations',
    config: {
      handler: azure.listOperations,
      description: 'List supported RP operations',
      notes: 'List supported RP operations',
//      tags: ['api'],
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
    path: '/subscriptions/{subscription_id}/providers/' + provider + '/updateCommunicationPreference',
    config: {
      handler: azure.updateCommunicationPreference,
      description: 'Update Communication Preference',
      notes: 'Update Communication Preference',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
        },
        payload: {
          firstName: Joi.string().required(),
          lastName: Joi.string().required(),
          email: Joi.string().email().required(),
          optInForCommunication: Joi.boolean().required()
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
    path: '/subscriptions/{subscription_id}/providers/' + provider + '/listCommunicationPreference',
    config: {
      handler: azure.listCommunicationPreference,
      description: 'List Communication Preference',
      notes: 'List Communication Preference',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
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
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}/RegenerateKey',
    config: {
      handler: azure.regenerateKey,
      description: 'Regenerate key',
      notes: 'Regenerate key',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
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
    path: '/subscriptions/{subscription_id}/resourcegroups/{resource_group_name}/providers/' + provider + '/accounts/{resource_name}/listSingleSignOnToken',
    config: {
      handler: azure.listSingleSignOnToken,
      description: 'List SSO token',
      notes: 'List SSL token',
//      tags: ['api'],
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
          subscription_id: Joi.string().required().lowercase().description('Azure Subscription ID'),
          resource_group_name: Joi.string().required().lowercase().description('Azure Resource Group name'),
          resource_name: Joi.string().required().lowercase().description('Azure Resource name')
        }
      },
//      response: {
//        schema: routeModels.listOfDNSZonesModel
//     }
    }
  },
];

