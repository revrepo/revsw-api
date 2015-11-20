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

var domainConfigsHandlers = require('../handlers/domainConfigs');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method : 'GET',
    path   : '/v1/domain_configs',
    config : {
      auth        : {
        scope : ['user', 'admin', 'reseller']
      },
      handler     : domainConfigsHandlers.getDomainConfigs,
      description : 'Get a list of domains registered for a customer',
      notes       : 'Use the call to receive a list of domains managed by the API user.',
      tags        : ['api', 'domain_configs'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
    //  response    : {
    //    schema : routeModels.listOfDomainsModel
    //  }
    }
  },

  {
    method : 'GET',
    path   : '/v1/domain_configs/{domain_id}',
    config : {
      auth        : {
        scope : ['user', 'admin', 'reseller']
      },
      handler     : domainConfigsHandlers.getDomainConfig,
      description : 'Get basic domain configuration',
      notes       : 'Use the call to receive basic domain configuration for specified domain ID.',
      tags        : ['api', 'domain_configs'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        params : {
          domain_id : Joi.objectId().required().description('Domain ID')
        },
        query: {
          version: Joi.number().integer().description('Configuration version number (request 0 for latest)')
        },
      },
//      response    : {
//        schema : routeModels.domainModel
//      }
    }
  },

  {
    method : 'GET',
    path   : '/v1/domain_configs/{domain_id}/config_status',
    config : {
      auth        : {
        scope : ['user', 'admin', 'reseller']
      },
      handler     : domainConfigsHandlers.getDomainConfigStatus,
      description : 'Get the publishing status of a domain configuration',
      notes       : 'Use the call to receive basic domain configuration for specified domain ID.',
      tags        : ['api', 'domain_configs'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        params : {
          domain_id : Joi.objectId().required().description('Domain ID')
        }
      },
//      response    : {
//        schema : routeModels.domainModel
//      }
    }
  },

  {
    method : 'POST',
    path   : '/v1/domain_configs',
    config : {
      auth        : {
        scope : ['user_rw', 'admin_rw', 'reseller_rw']
      },
      handler     : domainConfigsHandlers.createDomainConfig,
      description : 'Create a new domain configuration',
      notes       : 'Use the call to create a new domain configuration with default caching/ALC/etc rules. After that you can use ' +
      '/v1/domain_configs/{domain_id} calls to read and update all domain configuration properties.',
      tags        : ['api', 'domain_configs'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        payload : {
          // TODO: Enforce strict domain names (not string())
          domain_name                   : Joi.string().regex(routeModels.domainRegex)
            .required().description('The name of the new domain to be registered in the system'),
          account_id             : Joi.objectId().required().description('Account ID of the account the domain should be created for'),
          origin_host_header     : Joi.string().regex(routeModels.domainRegex).required()
            .description('"Host" header value used when accessing the origin server'),
          origin_server          : Joi.string().required().description('Origin server host name or IP address'),
          origin_server_location_id : Joi.objectId().required().description('The ID of origin server location'),
          tolerance              : Joi.string().optional().description('APEX metric for RUM reports (default value 3 seconds)')
        }
      },
      response    : {
        schema : routeModels.statusModel
      }
    }
  },

  {
    method : 'PUT',
    path   : '/v1/domain_configs/{domain_id}',
    config : {
      auth        : {
        scope : ['user_rw', 'admin_rw', 'reseller_rw']
      },
      handler     : domainConfigsHandlers.updateDomainConfig,
      description : 'Update detailed domain configuration',
      notes       : 'Use the function to update detailed domain configuration previously retreived using GET call for /v1/domains/{domain_id}/details end-point.',
      tags        : ['api', 'domains'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        params  : {
          domain_id : Joi.objectId().required().description('Domain ID')
        },
        query: {
          options: Joi.string().valid('verify_only', 'publish').optional()
        },
        payload : {
          account_id             : Joi.objectId().description('Account ID of the account the domain should be assiciated with'),
          origin_host_header     : Joi.string().regex(routeModels.domainRegex).description('"Host" header value used when accessing the origin server'),
          origin_server          : Joi.string().description('Origin server host name or IP address'),
          origin_server_location_id : Joi.objectId().description('The ID of origin server location'),
          tolerance              : Joi.string().optional().description('APEX metric for RUM reports (default value 3 seconds)'),
          '3rd_party_rewrite': Joi.object({
            '3rd_party_root_rewrite_domains': Joi.string().allow('').required(),
            '3rd_party_runtime_domains': Joi.string().allow('').required(),
            '3rd_party_urls': Joi.string().allow('').required(),
            enable_3rd_party_rewrite: Joi.boolean().required(),
            enable_3rd_party_root_rewrite: Joi.boolean().required(),
            enable_3rd_party_runtime_rewrite: Joi.boolean().required()
          }).required(),
          enable_origin_health_probe: Joi.boolean(),
          origin_health_probe: Joi.object({
            HTTP_REQUEST: Joi.string().required(),
            PROBE_TIMEOUT: Joi.number().integer().required(),
            PROBE_INTERVAL: Joi.number().integer().required(),
            HTTP_STATUS: Joi.number().integer().required()
          }),
          proxy_timeout: Joi.number().integer(),
          rev_component_co : Joi.object({
            enable_rum          : Joi.boolean().required(),
            enable_optimization : Joi.boolean().required(),
            enable_decompression : Joi.boolean(),
            mode                : Joi.string().valid('least', 'moderate', 'aggressive', 'custom', 'adaptive').required(),
            img_choice          : Joi.string().valid('off', 'low', 'medium', 'high').required(),
            js_choice           : Joi.string().valid('off', 'low', 'medium', 'high').required(),
            css_choice          : Joi.string().valid('off', 'low', 'medium', 'high').required()
          }).required(),
          rev_component_bp : Joi.object({
            end_user_response_headers: Joi.array().items({
              header_value: Joi.string(),
              header_name: Joi.string(),
              operation: Joi.string().allow('add', 'remove', 'replace')
            }),
            enable_cache           : Joi.boolean().required(),
            block_crawlers         : Joi.boolean().required(),
            cdn_overlay_urls       : Joi.array().items(Joi.string()).required(),
            caching_rules          : Joi.array().items({
              version              : Joi.number().valid(1).required(),
              url                  : Joi.object({
                is_wildcard : Joi.boolean().required(),
                value       : Joi.string().required()
              }).required(),
              edge_caching         : Joi.object({
                override_origin : Joi.boolean().required(),
                new_ttl         : Joi.number().integer().required(),
                override_no_cc  : Joi.boolean().required(),
                query_string_list_is_keep: Joi.boolean(),
                query_string_keep_or_remove_list: Joi.array().items(Joi.string()),
              }).required(),
              browser_caching      : Joi.object({
                override_edge    : Joi.boolean().required(),
                new_ttl          : Joi.number().integer().required(),
                force_revalidate : Joi.boolean().required()
              }).required(),
              cookies              : Joi.object({
                override                     : Joi.boolean().required(),
                ignore_all                   : Joi.boolean().required(),
                list_is_keep                 : Joi.boolean().required(),
                keep_or_ignore_list          : Joi.array().items(Joi.string()).required(),
                remove_ignored_from_request  : Joi.boolean().required(),
                remove_ignored_from_response : Joi.boolean().required()
              }).required(),
              serve_stale: Joi.object({
                origin_sick_ttl: Joi.number().integer(),
                while_fetching_ttl: Joi.number().integer(),
                enable: Joi.boolean()
              }),
              end_user_response_headers: Joi.array().items({
                header_value: Joi.string(),
                header_name: Joi.string(),
                operation: Joi.string().allow('add', 'remove', 'replace')
              }),
              origin_request_headers: Joi.array().items({
                header_value: Joi.string(),
                header_name: Joi.string(),
                operation: Joi.string().allow('add', 'remove', 'replace')
              }),
              cookies_cache_bypass : Joi.array().items(Joi.string())
            }).required(),
            enable_security        : Joi.boolean().required(),
            web_app_firewall       : Joi.string().valid('off', 'detect', 'block', 'block_all').required(),
            acl                    : Joi.object({
              enabled   : Joi.boolean().required(),
              action    : Joi.string().valid('deny_except', 'allow_except').required(),
              acl_rules : Joi.array().items ({
                host_name    : Joi.string().allow('').required(),
                subnet_mask  : Joi.string().allow('').required(),
                country_code : Joi.string().allow('').required(),
                header_name  : Joi.string().allow('').required(),
                header_value : Joi.string().allow('').required()
              }).required()
            }).required(),
            cache_bypass_locations : Joi.array().items(Joi.string()).required(),
            enable_vcl_geoip_headers: Joi.boolean(),
            custom_vcl: Joi.object({
              enabled: Joi.boolean(),
              backends: Joi.array().items({
                vcl: Joi.string(),
                dynamic: Joi.boolean(),
                port: Joi.number().integer(),
                host: Joi.string(),
                name: Joi.string()
              }),
              recv: Joi.string(),
              backend_response: Joi.string(),
              backend_error: Joi.string(),
              hit: Joi.string(),
              miss: Joi.string(),
              deliver: Joi.string(),
              pass: Joi.string(),
              pipe: Joi.string(),
              hash: Joi.string(),
              synth: Joi.string()
            })
          }).required()
        }
      },
//      response    : {
//        schema : routeModels.statusModel
//      }
    }
  },

  {
    method : 'DELETE',
    path   : '/v1/domain_configs/{domain_id}',
    config : {
      auth        : {
        scope : ['user_rw', 'admin_rw', 'reseller_rw']
      },
      handler     : domainConfigsHandlers.deleteDomainConfig,
      description : 'Delete a domain',
      notes       : 'Use the call to delete a domain configuration.',
      tags        : ['api', 'domains'],
      plugins     : {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      validate    : {
        params : {
          domain_id : Joi.objectId().required().description('Domain ID to delete')
        }
      },
//      response    : {
//        schema : routeModels.statusModel
//      }
    }
  }
];
