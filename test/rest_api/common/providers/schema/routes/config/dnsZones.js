/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var Joi = require('joi');

var routeModels = require('../models');
var ROUTE_IDS = require('../ids');

module.exports = [
  {
    method: 'GET',
    path: '/v1/dns_zones',
    config: {
      id: ROUTE_IDS.DNS_ZONES.GET.ALL,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      description: 'Get a list of DNS zones',
      notes: 'Use this function to get a list of DNS zones registered for your company account',
      tags: ['api'],
      validate:{
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().trim().description('ID of a company')
          })
            .optional().description('Filters parameters')
        }
      },
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
      id: ROUTE_IDS.DNS_ZONES.STATS.USAGE.GET.ALL,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
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
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone_id}/stats/usage',
    config: {
      id: ROUTE_IDS.DNS_ZONES.STATS.USAGE.GET.ONE,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      description: 'Get usage stats for one DNS zone',
      notes: 'Use this function to get usage stats for one DNS zone registered for your account',
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
        query:{
          period: Joi.string().required().default('24h').description('period: one of 1h, 24h, or 30d; default 24h'),
        }
      },
    }
  },
  {
    method: 'POST',
    path: '/v1/dns_zones',
    config: {
      id: ROUTE_IDS.DNS_ZONES.POST.NEW,
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
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
      id: ROUTE_IDS.DNS_ZONES.DELETE.ONE,
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
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
      id: ROUTE_IDS.DNS_ZONES.PUT.ONE,
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
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
          nx_ttl: Joi.number().integer().min(0).max(10800).optional().description('DNS zone NX TTL parameter'),
          ttl: Joi.number().integer().min(0).max(999999999).optional().description('DNS zone TTL parameter'),
          link: Joi.string().optional().allow(null).description('Link')
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
      id: ROUTE_IDS.DNS_ZONES.GET.ONE,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
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
      id: ROUTE_IDS.DNS_ZONES.CHECK_INTEGRATION.DNS_SERVERS.GET.ALL,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
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
      },
      // NOTE: This (response.schema) was added for Automation
      response: {
        schema: {
          root_zone: Joi.string().required(),
          check_reports: Joi.array().items({
            type_check: Joi.string().required(),
            hostname: Joi.string().required(),
            check_status_code: Joi.string().required(),
            message: Joi.string().required()
          }),
          check_status_code: Joi.string().required(),
          message: Joi.string().required()
        }
      }
    }
  }, {
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone_id}/checkintegration/records',
    config: {
      id: ROUTE_IDS.DNS_ZONES.CHECK_INTEGRATION.RECORDS.GET.ALL,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
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
      },
      // NOTE: This (response.schema) was added for Automation
      response: {
        schema: {
          zone: Joi.object().keys({
            zone: Joi.string(),
            account_id: Joi.string(),
            updated_by: Joi.string().email(),
            updated_at: Joi.string(),
            created_by: Joi.string().email(),
            created_at: Joi.string(),
            id: Joi.string()
          }),
          nsone_zone: Joi.object().keys({
            nx_ttl: Joi.number().integer(),
            retry: Joi.number().integer(),
            zone: Joi.string(),
            network_pools: Joi.array().items(Joi.string()),
            primary: Joi.object().keys({
              enabled: Joi.boolean(),
              secondaries: Joi.array()
            }),
            refresh: Joi.number().integer(),
            expiry: Joi.number().integer(),
            dns_servers: Joi.array().items(Joi.string()),
            records: Joi.array().items(Joi.object().keys({
              domain: Joi.string(),
              short_answers: Joi.array().items(Joi.string()),
              ttl: Joi.number().integer(),
              tier: Joi.number().integer(),
              type: Joi.string(),
              link: Joi.any(),
              id: Joi.string()
            })),
            meta: Joi.object(),
            link: Joi.any(),
            serial: Joi.number().integer(),
            ttl: Joi.number().integer(),
            id: Joi.string(),
            hostmaster: Joi.string().email(),
            networks: Joi.array().items(Joi.number().integer()),
            pool: Joi.string()
          }),
          dns_server_ip: Joi.string(),
          check_reports: Joi.array().items(Joi.object().keys({
            type_check: Joi.string(),
            check_status_code: Joi.string(),
            message: Joi.string()
          })),
          check_status_code: Joi.string(),
          message: Joi.string()
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/dns_zones/{dns_zone_id}/records',
    config: {
      id: ROUTE_IDS.DNS_ZONES.RECORDS.GET.ALL,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
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
      id: ROUTE_IDS.DNS_ZONES.RECORDS.POST.NEW,
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
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
            // TODO: check generator values
            //.valid('A','AAAA','ALIAS','CNAME','DNAME','HINFO','MX','NS','PTR','RP','SRV','TXT')
            .description('DNS zone record type to be created'),
          domain: Joi.string().required().trim().lowercase()
            .description('DNS zone record domain to be used in record'),
          record: Joi.object().keys({
            zone: Joi.string().optional(),
              // TODO: check generator values
              // .regex(/^(\*\.){0,1}(?=.{1,254}$)((?=[a-z0-9-]{1,63}\.)(xn--+)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,63}$/i),
            type: Joi.string().required()
              // TODO: check generator values
              //.allow('A','AAAA','ALIAS','CNAME','DNAME','HINFO','MX','NS','PTR','RP','SRV','TXT')
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
      id: ROUTE_IDS.DNS_ZONES.RECORDS.DELETE.ONE,
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
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
      id: ROUTE_IDS.DNS_ZONES.RECORDS.PUT.ONE,
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
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
      id: ROUTE_IDS.DNS_ZONES.RECORDS.GET.ONE,
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      description: 'Get a DNS zone record',
      notes: 'Use this function to get a DNS zone record',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      // NOTE: This (response.schema) was added for Automation
      response: {
        schema: {
          id: Joi.objectId().required().description('DNS Record ID'),
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
      }
    }
  },
];
