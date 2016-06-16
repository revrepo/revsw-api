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

'use strict';

var Joi = require('joi');

var sslNameHandlers = require('../handlers/sslNames');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/ssl_names',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslNameHandlers.listSSLNames,
      description: 'List of configured SSL names',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/ssl_names/{ssl_name_id}',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslNameHandlers.getSSLName,
      description: 'Get the details of an SSL name',
      tags: ['api'],
      validate: {
        params: {
          ssl_name_id: Joi.string().required().description('SSL name ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/ssl_names/{ssl_name}/approvers',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslNameHandlers.getSSLNameApprovers,
      description: 'Get a list of approvers for email-based domain control validation',
      tags: ['api'],
      validate: {
        params: {
          ssl_name: Joi.string().required().description('SSL name')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/ssl_names',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: sslNameHandlers.addSSLName,
      description: 'Add a new SSL name',
      tags: ['api'],
      validate: {
        payload : {
          account_id: Joi.objectId().required().description('Account ID of the account the SSL name should be created for'),
          ssl_name: Joi.string().min(1).max(150).required().description('SSL domain name'),
          //comment: Joi.string().max(300).allow('').optional().description('Optional comment field'),
          verification_method: Joi.string().valid('email','url','dns').required().description('Domain control verification method'),
          verification_email: Joi.string().allow('').email().description('Email address to use for email-based domain control verification method'),
          verification_wildcard: Joi.string().allow('').valid('true', 'false').description('Wildcard domain')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
      /*, // TODO validate resplnse format
      response    : {
        schema : routeModels.statusModel
      }*/
    }
  },

  {
    method: 'GET',
    path: '/v1/ssl_names/{ssl_name_id}/verify',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: sslNameHandlers.verifySSLName,
      description: 'Verify a previously configured SSL name',
      tags: ['api'],
      validate: {
        params: {
          ssl_name_id: Joi.string().required().description('SSL name ID')
        },
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/ssl_names/issue',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslNameHandlers.updateIssue,
      description: 'Update SSL certificates',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/ssl_names/{ssl_name_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: sslNameHandlers.deleteSSLName,
      description: 'Delete an SSL name',
      tags: ['api'],
      validate: {
        params: {
          ssl_name_id: Joi.string().required().description('SSL name ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  }
];
