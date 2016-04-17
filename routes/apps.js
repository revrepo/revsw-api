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
var app = require('../handlers/apps.js');
var routeModels = require('../lib/routeModels');

Joi.objectId = require('joi-objectid');

// define routes and validation for the API
module.exports = [
  {
    method: 'GET',
    path: '/v1/apps',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: app.getApps,
      description: 'Get a list of currently registered mobile applications',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
//      response: {
//        schema: Joi.array().items(routeModels.listAppsModel)
//      }
    }
  },
  {
    method: 'GET',
    path: '/v1/apps/{app_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: app.getApp,
      description: 'Get current configuration of a mobile application',
      tags: ['api'],
      validate: {
        params: {
          app_id: Joi.objectId().required().description('Unique application ID')
        },
        query: {
          version: Joi.number().integer().min(0).max(10000).description('Configuration version number (request 0 for latest)')
        },
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.AppModel
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/apps/{app_id}/versions',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: app.getAppVersions,
      description: 'Get a list of previous configurations of a mobile application',
      tags: ['api'],
      validate: {
        params: {
          app_id: Joi.objectId().required().description('Unique application ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
 //     response: {
 //       schema: Joi.array().items(routeModels.AppModel)
 //     }
    }
  },
  {
    method: 'GET',
    path: '/v1/apps/{app_id}/config_status',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: app.getAppConfigStatus,
      description: 'Get current configuration publishing status of a mobile application',
      tags: ['api'],
      validate: {
        params: {
          app_id: Joi.objectId().required().description('Unique application ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
//      response: {
//        schema: routeModels.appConfigStatusModel
//      }
    }
  },
  {
    method: 'POST',
    path: '/v1/apps',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: app.addApp,
      description: 'Register a new mobile application configuration',
      tags: ['api'],
      validate: {
        payload: {
          account_id: Joi.objectId().required().description('Account ID the new app should be associated with'),
          app_name: Joi.string().max(50).required().description('Name of the mobile application'),
          app_platform: Joi.string().required().valid('iOS', 'Android').description('Name of the mobile application platform')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.NewAppStatusModel
      }
    }
  },
  {
    method: 'PUT',
    path: '/v1/apps/{app_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: app.updateApp,
      description: 'Update the current configuration of a mobile application',
      tags: ['api'],
      validate: {
        params: {
          app_id: Joi.objectId().required().description('Unique application ID')
        },
        query: {
          options: Joi.string().valid('verify_only', 'publish').optional()
        },
        payload: {
          app_name: Joi.string().max(50).description('Name of the mobile application'),
          account_id: Joi.objectId().description('Account ID'),
          configs: Joi.array().required().items(routeModels.AppConfigModel)
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.AppStatusModel
      }
    }
  },
  {
    method: 'DELETE',
    path: '/v1/apps/{app_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: app.deleteApp,
      description: 'Delete a mobile application configuration',
      tags: ['api'],
      validate: {
        params: {
          app_id: Joi.objectId().required().description('Unique application ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.AppStatusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/apps/sdk_releases',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: app.getSDKReleasedVersions,
      description: 'Get a list of released SDK versions for supported mobile platforms',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
//      response: {
//        schema: Joi.array().items(routeModels.listAppsModel)
//      }
    }
  },
];
