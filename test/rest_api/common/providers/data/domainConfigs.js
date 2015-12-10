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

// # Domain Configs Data Provider object
//
// Defines some methods to generate valid and common domain-configs test data.
// With common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var DomainConfigsDataProvider = {

  prefix: 'API-TEST',

  /**
   * ### DomainConfigsDataProvider.generateOne()
   *
   * Generates valida data that represents an domain-config which the
   * domain-configs REST API end points accept.
   *
   * @param {String} accountId, which will be used in the domain config data.
   *
   * @returns {Object} account info with the following schema
   *
   *     {
   *         domain_name: string
   *         account_id: string
   *         origin_host_header: string
   *         origin_server: string
   *         origin_server_location_id: string
   *     }
   */
  generateOne: function (accountId) {
    return {
      'domain_name': this.prefix + '-name-' + Date.now() + '.revsw.net',
      'account_id': accountId,
      'origin_host_header': this.prefix + '-config.revsw.net',
      'origin_server': this.prefix + '-website01.revsw.net',
      'origin_server_location_id': '55a56fa6476c10c329a90741',
      'tolerance': '4000'
    };
  },

  generateFull: function (accountID, prefix) {
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
    if (prefix) {
      fullConfig.origin_host_header = 'API-QA-website01' +
        prefix + '.revsw.net';
      return fullConfig;
    }
    return fullConfig;
  },

  cloneForUpdate: function (domain) {
    var newDomain = JSON.parse(JSON.stringify(domain));
    delete newDomain.domain_name;
    delete newDomain.cname;
    return newDomain;
  },

  DataDrivenHelper: {
    setValueByPath: function (obj, pathString, value) {
      var prop = obj;
      var path = pathString.split('.');
      for (var i = 0; i < path.length - 1; i++) {
        var key = path[i] === '0' ? 0 : path[i];
        //if (prop[key] === undefined) {
        //  prop[key] = key === 0 ? [{}] : {};
        //}
        prop = prop[key];
      }
      //console.log('OLD value', prop[path[i]]);
      prop[path[i]] = value;
      //console.log('NEW value', prop[path[i]]);
    },

    getValueByPath: function (obj, pathString) {
      //console.log('ssssaa', obj);
      var prop = JSON.parse(JSON.stringify(obj));
      //console.log('ssss', prop);
      var path = pathString.split('.');
      for (var i = 0; i < path.length - 1; i++) {
        prop = prop[path[i]];
        if (prop === undefined) {
          return undefined;
        }
      }
      //console.log('OLD value', prop[path[i]]);
      return prop[path[i]];
      //console.log('NEW value', prop[path[i]]);
    },

    generateEmptyData: function (propertyPath, schemaDef) {
      var data = {
        spec: 'should return bad request when trying to update domain ' +
        'with empty `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        testValue: undefined
      };
      switch (schemaDef) {
        // STRING values
        case 'Joi.string()':
          data.testValue = undefined;
          break;
        case 'Joi.string().allow("").required()':
          data.testValue = undefined;
          break;
        case 'Joi.string().required()':
          data.testValue = '';
          break;
        case 'Joi.string().valid("off", "low", "medium", "high").required()':
          data.testValue = '';
          break;
        case 'Joi.string().valid("add", "remove", "replace").required()':
          data.testValue = '';
          break;
        case 'Joi.string().valid("least", "moderate", "aggressive", ' +
        '"custom", "adaptive").required()':
          data.testValue = '';
          break;
        case 'Joi.string().valid("off", "detect", "block", "block_all")' +
        '.required()':
          data.testValue = '';
          break;
        case 'Joi.string().valid("deny_except", "allow_except").required()':
          data.testValue = '';
          break;
        // NUMBER values
        case 'Joi.number().integer()':
          data.testValue = undefined;
          break;
        case 'Joi.number().valid(1).required()':
          data.testValue = undefined;
          break;
        case 'Joi.number().integer().required()':
          data.testValue = undefined;
          break;
        // BOOLEAN values
        case 'Joi.boolean()':
          data.testValue = undefined;
          break;
        case 'Joi.boolean().required()':
          data.testValue = undefined;
          break;
        // OBJECT values
        case 'Joi.object({})':
          data.testValue = undefined;
          break;
        case 'Joi.object({}).required()':
          data.testValue = {};
          break;
        // ARRAY values
        case 'Joi.array().items({})':
          data.testValue = undefined;
          break;
        case 'Joi.array().items(Joi.string())':
          data.testValue = undefined;
          break;
        case 'Joi.array().items({}).required()':
          data.testValue = undefined;
          break;
        case 'Joi.array().items(Joi.string()).required()':
          data.testValue = [''];
          break;
        case 'Joi.array().items(Joi.string().required())':
          data.testValue = [''];
          break;
        // OTHER values
        default:
          if (/Joi\.objectId\(\)\.required\(\)/.test(schemaDef)) {
            data.testValue = '';
          }
          else if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
            data.testValue = '';
          }
          else if (/Joi\.string\(\)\.optional\(\)/.test(schemaDef)) {
            data.testValue = undefined;
          }
          else {
            //console.log('ALERT! not considered:', schemaDef);
            data.testValue = undefined;
          }
      }
      // TODO: Following cases update specified domain-property with empty value
      switch (propertyPath) {
        case 'origin_host_header':
          data.skipReason = '[BUG: Getting Success response]';
          data.spec = data.skipReason + ' ' + data.spec;
          break;
        case '3rd_party_rewrite.3rd_party_root_rewrite_domains':
          data.skipReason = '[BUG: Getting Success response]';
          data.spec = data.skipReason + ' ' + data.spec;
          break;
        default:
          break;
      }
      return data;
    }

  }

};

module.exports = DomainConfigsDataProvider;