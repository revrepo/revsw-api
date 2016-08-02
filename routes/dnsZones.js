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
      description: 'Get a list of DNS zones',
      notes: 'Use this function to get a list of DNS zones registered for your company account',
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
    method: 'GET',
    path: '/v1/dns_zones/stats/usage',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.getDnsZonesStatsUsage,
      description: 'Get usage stats for all DNS zones',
      notes: 'Use this function to get usage stats for all DNS zones registered for your account',
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
      description: 'Create a new DNS zone',
      notes: 'Use the call to create new DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          account_id: Joi.objectId().required().trim()
            .description('ID of a company the new DNS zone should be created for'),
          zone: Joi.string().required().trim().lowercase().regex(routeModels.domainRegex)
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
      description: 'Delete a DNS zone',
      notes: 'This function should be used by a company admin to delete a DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID to be deleted')
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
      handler: dnsZone.updateDnsZone,
      description: 'Update a DNS zone',
      notes: 'This function should be used by a company admin to update a DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID of zone to be updated')
        },
        payload: {
            refresh: Joi.number().integer().optional().description('DNS zone refresh parameter'),
            retry: Joi.number().integer().optional().description('DNS zone retry parameter'),
            expiry: Joi.number().integer().optional().description('DNS zone expiry parameter'),
            nx_ttl: Joi.number().integer().optional().description('DNS zone NX TTL parameter'),
            ttl: Joi.number().integer().optional().description('DNS zone TTL parameter'),
            link: Joi.string().optional().allow(null).description('Link')
            // TODO: add secondary zone
            // secondary: Joi.object().optional().keys({
            //   enabled: Joi.boolean().required(),
            //   primary_ip:Joi.number().required(),
            //   primary_port:Joi.string().optional()
            // }).description('If the zone is a secondary zone')
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
      notes: 'Use this function to get the details of a specific DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID')
        }
      },
      response: {
        schema: routeModels.DNSZoneModel
      }
    }
  },
    {
     method: 'GET',
     path: '/v1/dns_zones/{dns_zone_id}/checkintegration/dns_servers',
     config: {
       auth: {
         scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
       },
       handler: dnsZone.checkDnsZoneNS,
       description: 'Get a check integration information about NSONE DNS Servers',
       notes: 'Use this function to check integration NSONE DNS Servers ',
       tags: ['api'],
       plugins: {
         'hapi-swagger': {
           responseMessages: routeModels.standardHTTPErrors
         }
       },
       validate: {
         params: {
           dns_zone_id: Joi.objectId().required().description('DNS zone ID')
         }
       }
     }
   }, {
     method: 'GET',
     path: '/v1/dns_zones/{dns_zone_id}/checkintegration/records',
     config: {
       auth: {
         scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
       },
       handler: dnsZone.checkDnsZoneRecords,
       description: 'Get a check integration informations for DNS Zone Records',
       notes: 'Use this function to check integration NSONE DNS Records',
       tags: ['api'],
       plugins: {
         'hapi-swagger': {
           responseMessages: routeModels.standardHTTPErrors
         }
       },
       validate: {
         params: {
           dns_zone_id: Joi.objectId().required().description('DNS zone ID')
         }
       }
     }
   },
  {
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone_id}/records',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.getDnsZoneRecords,
      description: 'Get a list of DNS records in a zone',
      notes: 'Use this function to get a list of DNS records configured for a zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID')
        }
      },
      response: {
        schema: routeModels.listOfDNSZoneRecordsModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/dns_zones/{dns_zone_id}/records',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.createDnsZoneRecord,
      description: 'Create a new DNS zone record',
      notes: 'Use the call to create a new record in a DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID')
        },

        payload: {
          type: Joi.string().required()
            .description('DNS zone record type to be created'),
          domain: Joi.string().required().trim().lowercase()
            .description('DNS zone record domain to be used in record'),
          record: Joi.object().keys({
            zone: Joi.string().optional(),
            type: Joi.string().required()
              .description('DNS zone record type to be created'),
            domain: Joi.string().required().trim().lowercase()
              .description('DNS zone record domain to be used in record'),
            answers: Joi.array().required().description('DNS zone record answers'),
            ttl: Joi.number().integer().optional().description('DNS zone record TTL parameter'),
            link: Joi.string().optional().allow(null).description('Link')
          }).required()
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
    path: '/v1/dns_zones/{dns_zone_id}/records/{dns_zone_record_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.deleteDnsZoneRecord,
      description: 'Delete a DNS zone record',
      notes: 'Use the call to delete a record from a DNS zone',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID'),
          dns_zone_record_id: Joi.objectId().required().description('DNS zone record ID')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'PUT',
    path: '/v1/dns_zones/{dns_zone_id}/records/{dns_zone_record_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: dnsZone.updateDnsZoneRecord,
      description: 'Update a DNS zone record',
      notes: 'Use the call to update a DNS zone record',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          dns_zone_id: Joi.objectId().required().description('DNS zone ID'),
          dns_zone_record_id: Joi.objectId().required().description('DNS zone record ID')
        },
        payload: {
          domain: Joi.string().required().trim().lowercase()//.regex(routeModels.domainRegex)
            .description('DNS zone record domain to be updated'),
          zone: Joi.string().optional()
           .description('DNS zone'),
          type: Joi.string().required()
            .description('DNS zone record type to be updated'),
          link: Joi.string().optional().allow(null).allow(''),
          use_client_subnet: Joi.boolean().required(),
            answers: Joi.array().optional().description('DNS zone record answers'),
            ttl: Joi.number().integer().optional().description('DNS zone record ttl parameter'),
            tier: Joi.number().integer().optional().allow(null).description('DNS zone record tier parameter')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone_id}/records/{dns_zone_record_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: dnsZone.getDnsZoneRecord,
      description: 'Get a DNS zone record',
      notes: 'Use this function to get a DNS zone record',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      // response: {
      //   schema: routeModels.listOfDNSZonesModel
      // }
    }
  },
];
