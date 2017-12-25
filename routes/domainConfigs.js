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

/*jslint node: true */

'use strict';

var Joi = require('joi');

var domainConfigsHandlers = require('../handlers/domainConfigs');

var routeModels = require('../lib/routeModels');

module.exports = [{
    method: 'GET',
    path: '/v1/domain_configs',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.getDomainConfigs,
      description: 'Get a list of domains registered for a customer',
      notes: 'Use the call to receive a list of domains managed by the API user.',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate:{
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().trim().description('ID of a company')
          })
         .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.listOfDomainsModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/domain_configs/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.getDomainConfig,
      description: 'Get basic domain configuration',
      notes: 'Use the call to receive basic domain configuration for specified domain ID.',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          version: Joi.number().integer().description('Configuration version number (request 0 for latest)')
        },
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/domain_configs/{domain_id}/versions',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.getDomainConfigVersions,
      description: 'Get a list of domain configuration versions',
      notes: 'Use the call to receive a list of previous domain configurations for specified domain ID.',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        }
      },
      response: {
        schema: routeModels.listOfDomainsModel
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/domain_configs/{domain_id}/waf_rules_list',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.getWAFRulesList,
      description: 'Get a list of WAF Rules for domain',
      notes: 'Use the call to receive a list of WAF Rules with description for specified domain ID',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        }
      },
      // TODO: add scheme for list
      // response: {
      //   schema: routeModels.listOfDomainsModel
      // }
    }
  },
  {
    method: 'GET',
    path: '/v1/domain_configs/{domain_id}/config_status',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.getDomainConfigStatus,
      description: 'Get the publishing status of a domain configuration',
      notes: 'Use the call to receive basic domain configuration for specified domain ID.',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        }
      },
      response: {
        schema: routeModels.domainStatusModel
      }
    }
  }, {
    method: 'GET',
    path: '/v1/domain_configs/{domain_id}/check_integration/{check_type}', // TODO please move "check_type" from path to query
    // string parameter and make it optional.
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.checkIntegration,
      description: 'Check the correctness of a domain integration',
      notes: 'Use the call to run a series of checks to verify the correctness of web domain configuration/integration for a domain.',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID'),
          check_type: Joi.string().required().valid('cname', 'domain_name', 'domain_aliases', 'domain_wildcard_alias', 'stagin_proxy_server', 'production_proxy_server')
            .description('The type of performed integration check')
        }
      },
      // response    : {
      //   schema : routeModels.listOfDomainsModel
      // }
    }
  }, {
    method: 'POST',
    path: '/v1/domain_configs',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: domainConfigsHandlers.createDomainConfig,
      description: 'Create a new domain configuration',
      notes: 'Use the call to create a new domain configuration with default caching/ALC/etc rules. After that you can use ' +
        '/v1/domain_configs/{domain_id} calls to read and update all domain configuration properties.',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          // TODO: Enforce strict domain names (not string())
          domain_name: Joi.string().lowercase().regex(routeModels.domainRegex)
            .required().description('The name of the new domain to be registered in the system'),
          account_id: Joi.objectId().required().description('Account ID of the account the domain should be created for'),
          origin_host_header: Joi.string().regex(routeModels.domainRegex).required()
            .description('"Host" header value used when accessing the origin server'),
          origin_server: Joi.alternatives().try([
            Joi.string().regex(routeModels.domainRegex),
            Joi.string().regex(routeModels.ipAddressRegex)
          ]).required().description('Origin server host name or IP address'),
          origin_server_location_id: Joi.objectId().required().description('The ID of origin server location'),
          tolerance: Joi.string().regex(/^\d+$/).min(1).max(10).optional().description('APEX metric for RUM reports (default value 3 seconds)'),
          comment: Joi.string().allow('').max(300).description('Comment')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/domain_configs/{domain_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: domainConfigsHandlers.updateDomainConfig,
      description: 'Update detailed domain configuration',
      notes: 'Use the function to update detailed domain configuration previously retreived using GET call for /v1/domains/{domain_id}/details end-point.',
      tags: ['api', 'domains'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          options: Joi.string().valid('verify_only', 'publish').optional()
        },
        payload: {
          account_id: Joi.objectId().required().description('Account ID of the account the domain should be assiciated with'),
          comment: Joi.string().trim().allow('').optional().max(300).description('Free-text comment about the domain'),
          origin_host_header: Joi.string().required().allow('').regex(routeModels.domainRegex)
            .description('"Host" header value used when accessing the origin server'),
          origin_server: Joi.alternatives().try([
            Joi.string().regex(routeModels.domainRegex),
            Joi.string().regex(routeModels.ipAddressRegex)
          ]).required().description('Origin server host name or IP address'),
          origin_server_location_id: Joi.objectId().required().description('The ID of origin server location'),
          origin_secure_protocol: Joi.string().valid('use_end_user_protocol', 'http_only', 'https_only').description('Origin server protocol'),
          config_command_options: Joi.string().allow('').max(150),
          tolerance: Joi.string().regex(/^\d+$/).min(1).max(10).optional().description('APEX metric for RUM reports (default value 3 seconds)'),
          '3rd_party_rewrite': Joi.object({
            '3rd_party_root_rewrite_domains': Joi.string().allow('').max(1500).required(),
            '3rd_party_runtime_domains': Joi.string().allow('').max(1500).required(),
            '3rd_party_urls': Joi.string().allow('').max(1500).required(),
            enable_3rd_party_rewrite: Joi.boolean().required(),
            enable_3rd_party_root_rewrite: Joi.boolean().required(),
            enable_3rd_party_runtime_rewrite: Joi.boolean().required()
          }).required(),
          enable_origin_health_probe: Joi.boolean(),
          domain_aliases: Joi.array().items(Joi.string().lowercase().regex(routeModels.domainRegex)),
          origin_health_probe: Joi.object({
            HTTP_REQUEST: Joi.string().required().max(150),
            PROBE_TIMEOUT: Joi.number().integer().required(),
            PROBE_INTERVAL: Joi.number().integer().required(),
            HTTP_STATUS: Joi.number().integer().required()
          }),
          proxy_timeout: Joi.number().integer(),
          domain_wildcard_alias: Joi.string().lowercase().max(150),
          enable_ssl: Joi.boolean(),
          ssl_conf_profile: Joi.objectId().allow(''),
          ssl_protocols: Joi.string().allow(''),
          ssl_ciphers: Joi.string().allow(''),
          ssl_prefer_server_ciphers: Joi.boolean(),
          ssl_cert_id: Joi.objectId().allow(''),
          btt_key: Joi.string().max(32).allow(''),
          rev_component_co: Joi.object({
            enable_rum: Joi.boolean().required(),
            enable_optimization: Joi.boolean().required(),
            enable_decompression: Joi.boolean(),
            mode: Joi.string().valid('least', 'moderate', 'aggressive', 'custom', 'adaptive').required(),
            img_choice: Joi.string().valid('off', 'low', 'medium', 'high').required(),
            js_choice: Joi.string().valid('off', 'low', 'medium', 'high').required(),
            css_choice: Joi.string().valid('off', 'low', 'medium', 'high').required(),
            origin_http_keepalive_ttl: Joi.number().integer(),
            origin_http_keepalive_enabled: Joi.boolean(),
            origin_request_headers: Joi.array().items({
              header_value: Joi.string().required(),
              header_name: Joi.string().required(),
              operation: Joi.string().valid('add', 'delete', 'replace').required()
            }),
          }).required(),
          rev_component_bp: Joi.object({
            enable_quic: Joi.boolean(),
            end_user_response_headers: Joi.array().items({
              header_value: Joi.string().regex(routeModels.httpHeaderValue).required(),
              header_name: Joi.string().regex(routeModels.httpHeaderName).required(),
              operation: Joi.string().valid('add', 'delete', 'replace').required()
            }),
            enable_cache: Joi.boolean().required(),
            block_crawlers: Joi.boolean().required(),
            cdn_overlay_urls: Joi.array().items(Joi.alternatives().try([Joi.string().uri(), Joi.string().regex(routeModels.domainRegex)])).required(),
            caching_rules: Joi.array().items({
              version: Joi.number().valid(1).required(),
              url: Joi.object({
                is_wildcard: Joi.boolean().required(),
                value: Joi.string().max(300).required()
              }).required(),
              enable_esi: Joi.boolean().default(false),
              edge_caching: Joi.object({
                override_origin: Joi.boolean().required(),
                new_ttl: Joi.number().integer().required(),
                override_no_cc: Joi.boolean().required(),
                query_string_list_is_keep: Joi.boolean(),
                query_string_keep_or_remove_list: Joi.array().items(Joi.string().max(150)),
              }).required(),
              browser_caching: Joi.object({
                override_edge: Joi.boolean().required(),
                new_ttl: Joi.number().integer().required(),
                force_revalidate: Joi.boolean().required()
              }).required(),
              cookies: Joi.object({
                override: Joi.boolean().required(),
                ignore_all: Joi.boolean().required(),
                list_is_keep: Joi.boolean().required(),
                keep_or_ignore_list: Joi.array().items(Joi.string().max(150)).required(),
                remove_ignored_from_request: Joi.boolean().required(),
                remove_ignored_from_response: Joi.boolean().required()
              }).required(),
              serve_stale: Joi.object({
                origin_sick_ttl: Joi.number().integer().required(),
                while_fetching_ttl: Joi.number().integer().required(),
                enable: Joi.boolean().required()
              }),
              end_user_response_headers: Joi.array().items({
                header_value: Joi.string().regex(routeModels.httpHeaderValue).required(),
                header_name: Joi.string().regex(routeModels.httpHeaderName).required(),
                operation: Joi.string().valid('add', 'remove', 'replace').required()
              }),
              origin_request_headers: Joi.array().items({
                header_value: Joi.string().regex(routeModels.httpHeaderValue).required(),
                header_name: Joi.string().regex(routeModels.httpHeaderName).required(),
                operation: Joi.string().valid('add', 'remove', 'replace').required()
              }),
              origin_redirects: Joi.object({
                override: Joi.boolean().required(),
                follow: Joi.boolean().required()
              }),
              cookies_cache_bypass: Joi.array().items(Joi.string().max(150))
            }).required(),
            enable_security: Joi.boolean().required(),

            // TODO need to remove the attribute
            web_app_firewall: Joi.string().valid('off', 'detect', 'block', 'block_all').required(),

            // WAF-related configuration
            // TODO need to add descriptions and proper validation of input
            enable_waf             : Joi.boolean(),
            waf                    : Joi.array().items({
              location                  : Joi.string().max(150).required(),
              enable_waf                : Joi.boolean().required(),
              enable_learning_mode      : Joi.boolean().required(),
              enable_sql_injection_lib  : Joi.boolean().required(),
              enable_xss_injection_lib  : Joi.boolean().required(),
              waf_rules                 : Joi.array().items(Joi.objectId()),
              waf_actions               : Joi.array().items({
                condition     : Joi.string(),
                action        : Joi.string().valid('DROP','BLOCK','LOG','ALLOW')
              })
            }),

            // TODO: need to add proper descriptions
            enable_bot_protection  : Joi.boolean(),
            bot_protection              : Joi.array().items({
              location                  : Joi.string().max(150).required(),
              mode                      : Joi.string().valid('disable','monitor','active_protection').required(),
              call_type                 : Joi.number().integer().min(1).max(6).required(),
              username_cookie_name      : Joi.string().max(300).allow('').required(),
              sessionid_cookie_name     : Joi.string().max(300).allow('').required(),
              bot_protection_id         : Joi.string().max(36).required()
            }),

            // TODO: add proper descriptions
            enable_wallarm: Joi.boolean().default(false),
            wallarm_config: Joi.array().items({
              location                  : Joi.string().required().default('/'),
              wallarm_mode              : Joi.string().required().valid('off','monitoring','block').default('off'),
              wallarm_instance          : Joi.number().integer(),
              wallarm_mode_allow_override : Joi.string().valid('off','strict','on'),
              wallarm_parse_response    : Joi.string().valid('on','off'),
              wallarm_parser_disable    : Joi.string().valid('action','cookie','gzip','json','multipart','base64','path','percent','urlenc','xml'),
              wallarm_process_time_limit  : Joi.number().integer(),
              wallarm_process_time_limit_block  : Joi.string().valid('on','off','attack'),
              wallarm_unpack_response   : Joi.string().valid('on','off')
            }),

            acl: Joi.object({
              enabled: Joi.boolean().required(),
              action: Joi.string().valid('deny_except', 'allow_except').required(),
              acl_rules: Joi.array().items({
                host_name: Joi.string().allow('').hostname().required(),
                subnet_mask: Joi.string().allow('').regex(routeModels.subnetMask).required(),
                country_code: Joi.string().allow('').regex(routeModels.countryCode).required(),
                header_name: Joi.string().allow('').regex(routeModels.httpHeaderName).required(),
                header_value: Joi.string().allow('').regex(routeModels.httpHeaderValue).required()
              }).required()
            }).required(),
            cache_bypass_locations: Joi.array().items(Joi.string().max(150)).required(),
            co_bypass_locations: Joi.array().items(Joi.string().max(150)),
            enable_vcl_geoip_headers: Joi.boolean(),
            custom_vcl: Joi.object({
              enabled: Joi.boolean().required(),
              backends: Joi.array().items({
                vcl: Joi.string().max(10000).required(),
                dynamic: Joi.boolean().required(),
                port: Joi.number().integer().required(),
                host: Joi.alternatives().try([Joi.string().uri(), Joi.string().regex(routeModels.domainRegex)]).required(),
                name: Joi.string().max(150).required()
              }),
              recv: Joi.string().trim().allow('').max(40000),
              backend_response: Joi.string().trim().allow('').max(40000),
              backend_error: Joi.string().trim().allow('').max(40000),
              backend_fetch: Joi.string().trim().allow('').max(40000),
              hit: Joi.string().trim().allow('').max(40000),
              miss: Joi.string().trim().allow('').max(40000),
              deliver: Joi.string().trim().allow('').max(40000),
              pass: Joi.string().trim().allow('').max(40000),
              pipe: Joi.string().trim().allow('').max(40000),
              hash: Joi.string().trim().allow('').max(40000),
              synth: Joi.string().trim().allow('').max(40000)
            })
          }).required(),
          bp_lua: Joi.array().items({
            location: Joi.string().max(150)
              .description('Lua location for BP'),
            code: Joi.string().max(2000)
              .description('Lua code for the BP lua location'),
            enable: Joi.boolean().default(false)
              .description('Include or exclude BP lua code for domain proxy configuration'),
            approve: Joi.boolean().default(false)
              .description('Approve lua code/location posted by user (Replaces effective params if true)')
          }),
          bp_lua_enable_all: Joi.boolean().optional(),

          co_lua: Joi.array().items({
            location: Joi.string().max(150)
              .description('Lua location for CO'),
            code: Joi.string().max(2000)
              .description('Lua code for the CO lua location'),
            enable: Joi.boolean().default(false)
              .description('Include or exclude CO lua code for domain proxy configuration'),
            approve: Joi.boolean().default(false)
              .description('Approve lua code/location posted by user (Replaces effective params if true)')
          }),
          co_lua_enable_all: Joi.boolean().optional(),
          enable_enhanced_analytics: Joi.boolean().optional().description('Enhanced Traffic Analytics'),
          image_engine: Joi.object({
            enable_image_engine: Joi.boolean().default(false).description('Enabled ImageEngine'),
            image_engine_token: Joi.string().allow('').default('nnml').description('Used to access SM’s backend'),
            image_engine_api_key: Joi.string().allow('').optional().default('').description('API Key to access SM’s purge API'),
            image_engine_origin_server: Joi.string().allow('').optional().default('').description('A temporary field - will be removed '),
            refresh_image_engine_configuration: Joi.boolean().default(false)
              .description('Refresh Image Engine Configuration - update the custom VCL code with the current master VCL code. PROPERTY NOT BE STORED'),
            custom_configuration_present: Joi.boolean().optional()
              .description('compare the configured master IE VCL code with current custom VCL code set for a domain. PROPERTY NOT BE STORED')
          }),
          github_integration: Joi.object({
            enable: Joi.boolean().default(false).description('Enabled GitHub Integration'),
            github_url: Joi.alternatives().when('enable', {
              is: true, then: Joi.string().uri().required(),
              otherwise: Joi.string().allow('').max(300).optional()
            }).description('Url to GitHub file'),
            github_personal_api_key: Joi.alternatives().when('enable', {
              is: true, then: Joi.string().regex(routeModels.gihubPersonalAccessToken).required(),
              otherwise: Joi.string().allow('').optional()
            }).description('Personal API Key GitHub'),
          }).description('GitHub Integration')
        }
      },
      //      response    : {
      //        schema : routeModels.statusModel
      //      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/domain_configs/{domain_id}',
    config: {
      auth: {
        scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: domainConfigsHandlers.deleteDomainConfig,
      description: 'Delete a domain',
      notes: 'Use the call to delete a domain configuration.',
      tags: ['api', 'domains'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID to delete')
        }
      },
      //      response    : {
      //        schema : routeModels.statusModel
      //      }
    }
  },
  {
    method: 'GET',
    path: '/v1/domain_configs/recommended_default_settings',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: domainConfigsHandlers.getRecommendedDefaultSettings,
      description: 'Provides a list of recommended default values for different domain configuration attributes',
      notes: 'TODO text',
      tags: ['api', 'domain_configs'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.recommendedDefaultDomainSettings
      }
    }
  },
];
