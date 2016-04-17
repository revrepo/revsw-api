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

// # Apps Data Provider object
//
// Defines some methods to generate valid and common APP test data. With
// common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var AppsDataProvider = {

  prefix: 'API_TEST_APP_',

  /**
   * ### AppsDataProvider.generateOne()
   *
   * Generates valida data that represents an APP which APPS REST API
   * end points accept.
   *
   * @param {String} accountId, which will be used in the domain config data.
   * @param {String} prefix, a prefix value to put in the name
   *
   * @returns {Object} app info with the following schema
   *
   *     {
   *         account_id: String,
   *         app_name: String,
   *         app_platform: String
   *     }
   */
  generateOne: function (accountId, prefix) {
    return {
      account_id: accountId,
      app_name: (prefix ? prefix + '_' : '' ) + this.prefix + Date.now(),
      app_platform: 'iOS'
    };
  },

  generateOneForUpdate: function (accountId, prefix) {
    return {
      account_id: accountId,
      app_name: (prefix ? prefix + '_' : '' ) + this.prefix + Date.now(),
      configs: [
        {
          sdk_release_version: 1,
          logging_level: 'debug',
          configuration_refresh_interval_sec: 3600,
          configuration_stale_timeout_sec: 36000,
          operation_mode: 'transfer_and_report',
          initial_transport_protocol: 'standard',
          stats_reporting_interval_sec: 60,
          stats_reporting_level: 'debug',
          stats_reporting_max_requests_per_report: 500,
          a_b_testing_origin_offload_ratio: 0,
          domains_black_list: [],
          domains_white_list: [],
          domains_provisioned_list: [],
          allowed_transport_protocols: []
        }
      ]
    };
  },

  /**
   * ### DomainConfigsDataProvider.cloneForUpdate()
   *
   * Clones the given domain config in a new one which does not have a
   * domain_name nor a cname.
   *
   * @param {Domain Config Object}
   */
  cloneForUpdate: function (domain) {
    var newDomain = JSON.parse(JSON.stringify(domain));
    delete newDomain.domain_name;
    delete newDomain.cname;
    return newDomain;
  },

  DataDrivenHelper: {

    /**
     * ### DomainConfigsDataProvider.setValueByPath()
     *
     * @param {Domain Config Object} obj, object in which value is going to
     * be set
     * @param {String} pathString that represents the concatenation of keys and
     * the last key is the one that is going to change
     * @param {Object} any value that the property accepts
     */
    setValueByPath: function (obj, pathString, value) {
      var prop = obj;
      var path = pathString.split('.');
      for (var i = 0; i < path.length - 1; i++) {
        var key = path[i] === '0' ? 0 : path[i];
        prop = prop[key];
      }
      prop[path[i]] = value;
    },

    /**
     * ### DomainConfigsDataProvider.getValueByPath()
     *
     * @param {Domain Config Object} obj, object in which value is going to
     * be set
     * @param {String} pathString that represents the concatenation of keys and
     * the last key is the one that for which the value is going to be get
     * @returns {Onject|Undefined} the value that the key has in the specified
     * object, undefined otherwise
     */
    getValueByPath: function (obj, pathString) {
      var prop = JSON.parse(JSON.stringify(obj));
      var path = pathString.split('.');
      for (var i = 0; i < path.length - 1; i++) {
        prop = prop[path[i]];
        if (prop === undefined) {
          return undefined;
        }
      }
      return prop[path[i]];
    },

    /**
     * ### DomainConfigsDataProvider.generateEmptyData()
     *
     * Generates empty data for the key and based on the schema-definition
     * provided.
     *
     * @param {String} propertyPath, concatenation of keys
     * @param {String} schemaDef, schema defined by Joi
     * @returns {
     *     spec: string,
     *     propertyPath: *,
     *     testValue: {object|undefined}
     * }
     */
    generateEmptyData: function (propertyPath, schemaDef) {
      var data = {
        spec: 'should return bad request when trying to update apps ' +
        'with empty `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        testValue: undefined
      };
      switch (schemaDef) {
        // STRING values
        case 'Joi.string()':
          data.testValue = '';
          break;
        case 'Joi.string().allow("").required()':
          data.testValue = undefined;
          break;
        case 'Joi.string().required()':
          data.testValue = '';
          break;
        case 'Joi.string().max(1500).allow("").required()':
          data.testValue = undefined;
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
          else if (/oi\.string\(\)\.required\(\).allow\(""\)/.test(schemaDef)) {
            data.testValue = undefined;
          }
          else if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
            data.testValue = '';
          }
          else if (/Joi\.string\(\)\.optional\(\)/.test(schemaDef)) {
            data.testValue = undefined;
          }
          else {
            console.log('ALERT! In generateFull:: not considered:', schemaDef);
            data.testValue = undefined;
          }
      }
      return data;
    }
  }
};

module.exports = AppsDataProvider;
