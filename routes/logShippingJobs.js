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

var logShippingJobHandlers = require('../handlers/logShippingJobs');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/log_shipping_jobs',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: logShippingJobHandlers.listLogShippingJobs,
      description: 'List configured log shipping jobs',
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
    path: '/v1/log_shipping_jobs/{log_job_id}',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: logShippingJobHandlers.getLogShippingJob,
      description: 'Get a log shipping job configuration',
      tags: ['api'],
      validate: {
        params: {
          log_job_id: Joi.objectId().required().description('Log shipping job ID')
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
    path: '/v1/log_shipping_jobs/{log_job_id}/status',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: logShippingJobHandlers.getLogShippingJobStatus,
      description: 'Get the status of a log shipping job',
      tags: ['api'],
      validate: {
        params: {
          log_job_id: Joi.objectId().required().description('Log shipping job ID')
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
    path: '/v1/log_shipping_jobs',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: logShippingJobHandlers.createLogShippingJob,
      description: 'Create a new log shipping job',
      tags: ['api'],
      validate: {
        payload : {
          account_id: Joi.objectId().required().description('Account ID'),
          job_name: Joi.string().min(1).max(150).required().description('Log shipping job name')
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
    path: '/v1/log_shipping_jobs/{log_job_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: logShippingJobHandlers.updateLogShippingJob,
      description: 'Update a log shipping job',
      tags: ['api'],
      validate: {
        params: {
          log_job_id: Joi.objectId().required().description('Log shipping job ID'),
        },
        payload: {
          account_id: Joi.objectId().required().description('Account ID'),
          job_name: Joi.string().min(1).max(150).required().description('Log shipping job name'),
          operational_mode: Joi.string().valid('active','pause','stop').required().description('Set current job mode'),
          source_type: Joi.string().valid('domain','app').required().description('Source type (domain or app)'),
          source_id: Joi.objectId().required().description('Source ID'),
          destination_type: Joi.string().valid('syslog','s3', 'ftp', 'sftp', 'logstash', 'elasticsearch').required().description('Destination type'),
          destination_host: Joi.string().allow('').max(150).description('Destination host'),
          destination_port: Joi.string().allow('').max(10).description('Destination TCP/UDP port'),
          destination_key: Joi.string().allow('').max(150).description('Destination secret key'),
          destination_username: Joi.string().allow('').max(150).description('Destination username'),
          destination_password: Joi.string().allow('').max(150).description('Destination password'),
          notification_email: Joi.string().email().allow('').description('Notification email'),
          comment: Joi.string().max(300).allow('').optional().description('Optional comment field'),
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
    path: '/v1/log_shipping_jobs/{log_job_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: logShippingJobHandlers.deleteLogShippingJob,
      description: 'Delete a log shipping job',
      tags: ['api'],
      validate: {
        params: {
          log_job_id: Joi.objectId().required().description('Log shipping job ID'),
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
