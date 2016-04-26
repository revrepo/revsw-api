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

var sslCertificateHandlers = require('../handlers/sslCertificates');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/ssl_certs',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslCertificateHandlers.listSSLCertificates,
      description: 'List configured SSL certificates',
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
    path: '/v1/ssl_certs/{ssl_cert_id}',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslCertificateHandlers.getSSLCertificate,
      description: 'Get an SSL certificate',
      tags: ['api'],
      validate: {
        params: {
          ssl_cert_id: Joi.objectId().required().description('SSL certificate ID')
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
    path: '/v1/ssl_certs/{ssl_cert_id}/config_status',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: sslCertificateHandlers.getSSLCertificateStatus,
      description: 'Get the publishing status of an SSL certificate',
      tags: ['api'],
      validate: {
        params: {
          ssl_cert_id: Joi.objectId().required().description('SSL certificate ID')
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
    path: '/v1/ssl_certs',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: sslCertificateHandlers.createSSLCertificate,
      description: 'Create a new SSL certificate object',
      tags: ['api'],
      validate: {
        payload : {
          account_id: Joi.objectId().required().description('Account ID of the account the domain should be created for'),
          cert_name: Joi.string().min(1).max(150).required().description('SSL certificate name'),
          cert_type: Joi.string().valid('shared','private').required().description('SSL certificate type'),
          comment: Joi.string().max(300).allow('').optional().description('Optional comment field'),
          public_ssl_cert: Joi.string().min(1).max(10000).required().description('Public SSL certificate in PEM format'),
          private_ssl_key: Joi.string().min(1).max(10000).required().description('Private SSL key in PEM format'),
          private_ssl_key_passphrase: Joi.string().min(1).max(130).description('Password for the private SSL key'),
          chain_ssl_cert: Joi.string().min(1).max(10000).description('Optional SSL chain certificates in PEM format'),
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
    method: 'PUT',
    path: '/v1/ssl_certs/{ssl_cert_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: sslCertificateHandlers.updateSSLCertificate,
      description: 'Update an SSL certificate',
      tags: ['api'],
      validate: {
        params: {
          ssl_cert_id: Joi.objectId().required().description('SSL certificate ID'),
        },
        query: {
          options: Joi.string().valid('verify_only', 'publish').optional()
        },
        payload: {
          account_id: Joi.objectId().required().description('Account ID of the account the domain should be created for'),
          cert_name: Joi.string().min(1).max(150).required().description('SSL certificate name'),
          cert_type: Joi.string().valid('shared','private').required().description('SSL certificate type'),
          comment: Joi.string().max(300).allow('').optional().description('Optional comment field'),
          public_ssl_cert: Joi.string().min(1).max(10000).required().description('Public SSL certificate in PEM format'),
          private_ssl_key: Joi.string().min(1).max(10000).required().description('Private SSL key in PEM format'),
          private_ssl_key_passphrase: Joi.string().min(1).max(130).description('Password for the private SSL key'),
          chain_ssl_cert: Joi.string().min(1).max(10000).description('Optional SSL chain certificates in PEM format'),
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
    method: 'DELETE',
    path: '/v1/ssl_certs/{ssl_cert_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: sslCertificateHandlers.deleteSSLCertificate,
      description: 'Delete an SSL certificate',
      tags: ['api'],
      validate: {
        params: {
          ssl_cert_id: Joi.objectId().required().description('SSL certificate ID'),
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
