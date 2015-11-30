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

'use strict';

var faker = require('faker');
var _ = require('lodash');

// # Data Provider object
//
// Defines some methods to generate valid and common test data. With common we
// mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
module.exports = {

  /**
   * ### DataProvider.generateAccount()
   *
   * Generates valida data that represents an account and the account REST API
   * end points accept.
   *
   * @param {String} prefix, a prefix value to put in the name
   * @returns {Object} account info with the following schema
   *
   *     {
   *         companyName: string
   *     }
   */
  generateAccount: function (prefix) {
    return {
      companyName: (prefix ? prefix + '_' : '' ) + 'API_TEST_COMPANY_' +
      (new Date()).getTime()
    };
  },

  /**
   * ### DataProvider.generateBillingPlan()
   *
   * Generates valida data that represents an Billing Plan and the billing_plan REST API
   * end points accept.
   *
   * @returns {Object} Billing plan info with following schema
   *
   *    {
   *        name: string,
   *        description: string,
   *        type: string,
   *        monthly_fee: number,
   *        services: Array,
   *        prepay_discounts: Array
   *    }
   */
  generateBillingPlan: function () {
    return {
      name: faker.commerce.product(),
      description: faker.lorem.sentence(),
      type: _.random() ? 'public' : 'private',
      monthly_fee: faker.commerce.price(),

      services: [{
        code_name: faker.commerce.product(),
        description: faker.lorem.sentence(),
        measure_unit: faker.finance.currencyCode(),
        cost: faker.finance.amount(),
        included: 0
      }],

      prepay_discounts: [{
        period: 12,
        discount: 333
      }]
    };
  },

  /**
   * ### DataProvider.generateUser()
   *
   * Generates valid data that represents a user and the user REST API
   * end points accept.
   *
   * @param {String} prefix, a prefix value to put in the name
   * @returns {Object} account info with the following schema
   *
   *     {
   *         email: string
   *     }
   */
  generateUser: function (role, prefix) {
    var timestamp = (new Date()).getTime();

    prefix = prefix ? prefix + '_' : '';

    return {
      email: prefix + 'API_TEST_USER_' + timestamp + '@revsw.com',
      firstname: 'Jean',
      lastname: 'Valjean',
      password: 'secret123',
      access_control_list: {
        dashBoard: true,
        reports: true,
        configure: true,
        test: true,
        readOnly: true
      },
      role: role || 'user',
      theme: 'light'
    };
  },

  /**
   * ### DataProvider.generateSDKConfig()
   *
   * Generates valid data that represents a user and the user REST API
   * end points accept.
   *
   * @param {String} prefix, a prefix value to put in the name
   * @returns {Object} SDK Config with single value 'sdk_key' that currently
   * exists in the database
   * NOTE: due to lack of other endpoints (POST, PUT and DELETE) available
   * from the customer API, this value is hardcoded
   *
   */
  generateSDKConfig: function() {
    return {
      sdk_key: '0efbbd35-a131-4419-b330-00de5eb3696b'
    };
  },

  /**
   * ### DataProvider.generateInvalidSDKConfig()
   *
   * Generates invalid data that represents a user and that the user REST API
   * end points will not accept.
   *
   * @param {String} prefix, a prefix value to put in the name
   * @returns {Object} SDK Config with single value 'sdk_key' that currently
   * does not exist in the database
   *
   */
  generateInvalidSDKConfig: function() {
    return {
      sdk_key: '1ef4bd35-a131-4219-b330-00debbb3696b',
      too_long_sdk_key: '1ef4bd35-a131-4219-b330-00debbbf3696b',
      too_short_sdk_key: '1ef4bd35-a131-4219-b330-00dbbb3696b',
    };
  },

  generateInitialDomainConfig: function (accountId) {
    return  {
      'domain_name': 'API-QA-name-' + Date.now() + '.revsw.net',
      'account_id': accountId,
      'origin_host_header': 'API-QA-config.revsw.net',
      'origin_server': 'API-QA-website01.revsw.net',
      'origin_server_location_id': '55a56fa6476c10c329a90741',
    };
  },
  generateFullDomainConfig: function (accountID, prefix) {
    var fullConfig = {
      '3rd_party_rewrite': {
        '3rd_party_root_rewrite_domains': '',
        '3rd_party_runtime_domains': '',
        '3rd_party_urls': '',
        'enable_3rd_party_rewrite': false,
        'enable_3rd_party_root_rewrite': false,
        'enable_3rd_party_runtime_rewrite': false
      },
      'proxy_timeout': 20,
      'rev_component_bp': {
        'acl': {
          'acl_rules': [
            {
              'country_code': '',
              'header_name': '',
              'header_value': '',
              'host_name': '',
              'subnet_mask': ''
            }
          ],
          'action': 'deny_except',
          'enabled': false
        },
        'block_crawlers': false,
        'cache_bypass_locations': [],
        'caching_rules': [
          {
            'browser_caching': {
              'force_revalidate': false,
              'new_ttl': 1,
              'override_edge': false
            },
            'cookies': {
              'ignore_all': false,
              'keep_or_ignore_list': [],
              'list_is_keep': false,
              'override': false,
              'remove_ignored_from_request': false,
              'remove_ignored_from_response': false
            },
            'edge_caching': {
              'new_ttl': 0,
              'override_no_cc': false,
              'override_origin': false
            },
            'url': {
              'is_wildcard': true,
              'value': '**'
            },
            'version': 1
          }
        ],
        'cdn_overlay_urls': [],
        'enable_cache': true,
        'enable_security': true,
        'web_app_firewall': 'off'
      },
      'rev_component_co': {
        'css_choice': 'medium',
        'enable_optimization': false,
        'enable_rum': false,
        'img_choice': 'medium',
        'js_choice': 'medium',
        'mode': 'moderate'
      },
      'origin_server': 'API-QA-config.revsw.net',
      'origin_host_header': 'API-QA-website01.revsw.net',
      'account_id': accountID,
      'tolerance': '3000',
      'origin_server_location_id': '55a56fa6476c10c329a90741'
    };
    if(prefix){
      fullConfig.origin_host_header = 'API-QA-website01' +
        prefix + '.revsw.net';
      return fullConfig;
    }
    return fullConfig;
  },
  generateInvalidDomainConfig: function (accountId){
    return  {
      '3rd_party_rewrite': {
        '3rd_party_root_rewrite_domains': '',
        '3rd_party_runtime_domains': '',
        '3rd_party_urls': '',
        'enable_3rd_party_rewrite': false,
        'enable_3rd_party_root_rewrite': false,
        'enable_3rd_party_runtime_rewrite': false
      },
      'domain_name': 'API-QA-name-' + Date.now() + '.revsw.net',
      'account_id': accountId,
      'origin_host_header': 'API-QA-config.revsw.net',
      'origin_server': 'API-QA-website01.revsw.net',
      'origin_server_location_id': '55a56fa6476c10c329a90741',
      'proxy_timeout': 'this string should be an integer'
    };
  }
};
