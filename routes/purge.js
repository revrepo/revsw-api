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
var purges = require('../handlers/purges');
var routeModels = require('../lib/routeModels');
var config = require('config');

var purgeJobEnvironments = config.get('purge_job_environments');
var defaultPurgeJobEnvironment = config.get('purge_job_default_environment');

module.exports = [

  {
    method: 'POST',
    path: '/v1/purge',
    config: {
      auth: {
        scope: [ 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw' ]
      },
      handler: purges.purgeObject,
      description: 'Purge objects cached on CDN edge servers',
      notes: 'Use the function to purge objects from CDN edge caching servers. You can specify several "url" objects to purge multiple cached ' +
      'objects at once. After a purge request is submitted to the system you should remember received "request_id" ID and use it to check ' +
      'the status of the request using /v1/purge/{request_id} GET call.',
      tags: ['api', 'purge'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          domainName: Joi.string().lowercase().regex(routeModels.domainRegex).required().description('Domain name to purge objects for'),
          purges: Joi.array().items({
            url: Joi.object({
              is_wildcard: Joi.boolean().required()
                .description('Set true if "expression" is a regular expression, set to "false" if the "expression" is a wildcard pattern'),
              expression: Joi.string().max(150).trim().required().description('Wildcard expression if "is_wildcard" is set to true, otherwise - a regular expression')
            })
          }).required().description('Array of URLs to purge'),
          environment: Joi.string().default(defaultPurgeJobEnvironment).valid(purgeJobEnvironments).description('Purge job servers environment')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/purge',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: purges.getPurgeJobs,
      description: 'Get list purge requests',
      notes: 'Use the call to get list of a previously submitted object purge request.',
      tags: ['api', 'purge'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          domain_id:Joi.objectId().required().description('Domain Id'),
          limit: Joi.number().integer().min(0).default(10).optional().description('Pagination parameter - limit of record'),
          skip: Joi.number().integer().min(0).default(0).optional().description('Pagination parameter - skip')
        }
      },
      // response: {
      //   schema: routeModels.statusModel
      // }
    }
  },

  {
    method: 'GET',
    path: '/v1/purge/{request_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: purges.getPurgeJobStatus,
      description: 'Get the status of a previously submitted purge request',
      notes: 'Use the call to get the status of a previously submitted object purge request.',
      tags: ['api', 'purge'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          request_id: Joi.string().trim().regex(routeModels.uuidRegex)
            .required()
            .description('The ID of previously submitted purge request')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
