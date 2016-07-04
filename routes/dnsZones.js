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
      description: 'Get a list of DNS zones owned by company',
      notes: 'Use this function to get a list of DNS zones owned by your company account',
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
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.createDnsZone,
      description: 'Create new DNS zone',
      notes: 'Use the call to create new DNS zone for your company.',
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
              .description('DNS zone to be created for a company')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'DELETE',
    path: '/v1/dns_zones/{dns_zone_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.deleteDnsZone,
      description: 'Delete a customer DNS Zone',
      notes: 'This function should be used by a company admin to delete an DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone id of zone to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.getDnsZone,
      description: 'Get a DNS zone',
      notes: 'Use this function to a specific DNS zone with records',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone id')
        }
      },
      response: {
        schema: routeModels.DNSZoneModel
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/dns_zones/{dns_zone_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.createDnsZoneRecord,
      description: 'Create new DNS zone record',
      notes: 'Use the call to create new DNS zone record for selected DNS zone.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone id')
        },

        payload: {
          account_id: Joi.objectId().required().trim()
            .description('ID of a company the new DNS zone record should be created for'),
          record_type: Joi.string().required()
            .description('DNS zone record type to be created'),
          record_domain: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
            .description('DNS zone record domain to be used in record'),
          record_body: Joi.array().required()
            .description('DNS zone record body')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'DELETE',
    path: '/v1/dns_zones/{dns_zone_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.deleteDnsZoneRecord,
      description: 'Delete existing DNS zone record',
      notes: 'Use the call to delete a DNS zone record for selected DNS zone.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone id')
        },

        payload: {
          record_type: Joi.string().required()
            .description('DNS zone record type to be deleted'),
          record_domain: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
            .description('DNS zone record domain to be deleted')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'PUT',
    path: '/v1/dns_zones/{dns_zone_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.updateDnsZoneRecord,
      description: 'Update the DNS zone record',
      notes: 'Use the call to update existing DNS zone record for selected DNS zone.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone id')
        },

        payload: {
          record_type: Joi.string().required()
            .description('DNS zone record type to be updated'),
          record_domain: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
            .description('DNS zone record domain to be updated'),
          record_body: Joi.array().required()
            .description('DNS zone record update body')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
