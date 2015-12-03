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

// # DomainConfigs Schema Provider Object

// Requiring Joi library to define some Schema objects
var Joi = require('joi');

// Defining common variables
var dateFormatPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
var idFormatPattern = /^([0-9]|[a-f]){24}$/;

// Defines some methods that defines the `schema` for different type of
// responses that our DomainConfigs API returns.
//
// These schema objects are use on our test script to validate the data types
// of the results retrieved.
var DomainConfigsResponseSP = {

  /**
   * ### DomainConfigsResponseSP.getDomainConfig()
   *
   * @returns {Object} Domain Config schema as follows:
   *
   *     {
   *       companyName: {String}, // required
   *       createdBy: {String}, // required
   *       id: {String}, // required, pattern: /^([0-9]|[a-f]){24}$/
   *       created_at: {String}, // required, date-time string
   *       updated_at: {String} // required, date-time string
   *     }
   */
  getDomainConfig: function () {
    return Joi.object()
      .keys({
        account_id: Joi.string().regex(idFormatPattern).required(),
        id: Joi.string().regex(idFormatPattern).required(),
        domain_name: Joi.string().required(),
        created_by: Joi.string().required(),
        created_at: Joi.string().regex(dateFormatPattern).required(),
        updated_at: Joi.string().regex(dateFormatPattern),
        last_published_domain_version: Joi.number(),
        origin_host_header: Joi.string().required(),
        origin_server: Joi.string().required(),
        cname: Joi.string().required()
      });
  },

  /**
   * ### DomainConfigsResponseSP.getFullDomainConfig()
   *
   * @returns {Object} Full Domain Config schema
   */
  getFullDomainConfig: function () {
    return Joi.object()
      .keys({
        '3rd_party_rewrite': {
          '3rd_party_root_rewrite_domains': Joi.string(),
          '3rd_party_runtime_domains': Joi.string(),
          '3rd_party_urls': Joi.string(),
          'enable_3rd_party_rewrite': Joi.boolean(),
          'enable_3rd_party_root_rewrite': Joi.boolean(),
          'enable_3rd_party_runtime_rewrite': Joi.boolean()
        },
        'proxy_timeout': Joi.number(),
        'rev_component_bp': {
          'acl': {
            'acl_rules': [
              {
                'country_code': Joi.string(),
                'header_name': Joi.string(),
                'header_value': Joi.string(),
                'host_name': Joi.string(),
                'subnet_mask': Joi.string()
              }
            ],
            'action': Joi.string().regex(/^(deny_except|allow_except)$/),
            'enabled': Joi.boolean()
          },
          'block_crawlers': Joi.boolean(),
          'cache_bypass_locations': Joi.array(),
          'caching_rules': [
            {
              'browser_caching': {
                'force_revalidate': Joi.boolean(),
                'new_ttl': Joi.number(),
                'override_edge': Joi.boolean()
              },
              'cookies': {
                'ignore_all': Joi.boolean(),
                'keep_or_ignore_list': Joi.array(),
                'list_is_keep': Joi.boolean(),
                'override': Joi.boolean(),
                'remove_ignored_from_request': Joi.boolean(),
                'remove_ignored_from_response': Joi.boolean()
              },
              'edge_caching': {
                'new_ttl': Joi.number(),
                'override_no_cc': Joi.boolean(),
                'override_origin': Joi.boolean()
              },
              'url': {
                'is_wildcard': Joi.boolean(),
                'value': Joi.string()
              },
              'version': Joi.number()
            }
          ],
          'cdn_overlay_urls': Joi.array(),
          'enable_cache': Joi.boolean(),
          'enable_security': Joi.boolean(),
          'web_app_firewall': Joi.string().regex(/off|detect|block|block_all/)
        },
        'rev_component_co': {
          'css_choice': Joi.string().regex(/off|low|medium|high/),
          'enable_optimization': Joi.boolean(),
          'enable_rum': Joi.boolean(),
          'img_choice': Joi.string().regex(/off|low|medium|high/),
          'js_choice': Joi.string().regex(/off|low|medium|high/),
          'mode': Joi.string()
            .regex(/least|moderate|aggressive|custom|adaptive/)
        },
        account_id: Joi.string().regex(idFormatPattern).required(),
        id: Joi.string().regex(idFormatPattern).required(),
        domain_name: Joi.string().required(),
        origin_host_header: Joi.string().required(),
        origin_server: Joi.string().required(),
        cname: Joi.string(),
        tolerance: Joi.string(),
        origin_server_location_id: Joi.string().regex(idFormatPattern).required()
      }
    );
  },

  /**
   * ### DomainConfigsResponseSP.getDomainConfigStatus()
   *
   * @returns {Object} Domain Config Status schema as follows:
   *
   *     {
   *       staging_status: {String}, // required
   *       global_status: {String}, // required
   *     }
   */
  getDomainConfigStatus: function () {
    return Joi.object()
      .keys({
        staging_status: Joi.string()
          .regex(/^(Published|InProgress)$/).required(),
        global_status: Joi.string()
          .regex(/^(Published|Published|InProgress)$/).required()
      }
    );
  }
};

module.exports = DomainConfigsResponseSP;
