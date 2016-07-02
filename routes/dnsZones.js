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

var dnsZone = require('../handlers/dnsZones');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/dns_zones',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.getDnsZones,
      description: 'Get a list of DNS Zones owned by company',
      notes: 'Use this function to get a list of DNS Zones owned by your company account',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfDNSZonesModel
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/dns_zones',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.createDnsZone,
      description: 'Create a new DNS Zone',
      notes: 'Use the call to create a new DNS Zone for your company.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          account_id: Joi.objectId().required().trim()
            .description('ID of a company the new DNS Zone should be created for'),
          dns_zone: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
              .description('DNS Zone to be created for a company')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'DELETE',
    path: '/v1/dns_zones/{dns_zone}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.deleteDnsZone,
      description: 'Delete a customer DNS Zone',
      notes: 'This function should be used by a company admin to delete an DNS Zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
            .description('DNS Zone to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.getDnsZoneRecords,
      description: 'Get a list of DNS Zone Records',
      notes: 'Use this function to get a list of DNS Zone Records',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
            .description('DNS Zone')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
