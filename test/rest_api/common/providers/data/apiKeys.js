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

var faker = require('faker');
var Joi = require('joi');
var joiGenerator = new require('joi-generate').Generator();

var APIRoutesProvider = require('./../../../common/providers/APIRoutesProvider');

var apiKeyRouteConfig = APIRoutesProvider.get('apiKeys');

// # API Keys Data Provider object
//
// Defines some methods to generate valid and common API key. test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var APIKeyDataProvider = {

  prefix: 'TEST_API_KEY_',

  generate: function (type, callback) {
    var validation = apiKeyRouteConfig.getValidation('PUT', '/v1/api_keys/{key_id}');
    joiGenerator.generateAll(Joi.object(validation.payload), function (err, data) {
      callback(err, data[type]);
    });
  },

  /**
   * ### APIKeyDataProvider.generateOne()
   *
   * Generates valid data that represents a API Key and the REST API
   * end points accept.
   *
   * @param {String} accountId, account ID
   * @returns {Object} API Key info with the following schema
   *
   *    {
   *       account_id: String
   *    }
   */
  generateOne: function (accountId) {
    return {
      account_id: accountId
    };
  },

  /**
   * ### APIKeyDataProvider.generateCompleteOne()
   *
   * Generates valid data that represents a complete API Key and the REST API
   * end points accept.
   *
   * @param {String} accountId, account ID
   * @param {String} prefix, a prefix value to put in the name
   * @returns {Object} API Key info with the following schema
   *
   *    {
   *      account_id: String,
   *      managed_account_ids: [String],
   *      key_name: String,
   *      domains: Array,
   *      allowed_ops: {
   *        read_config: Boolean,
   *        modify_config: Boolean,
   *        delete_config: Boolean,
   *        purge: Boolean,
   *        reports: Boolean,
   *        admin: Boolean
   *      },
   *      read_only_status: Boolean,
   *      active: Boolean
   *    }
   */
  generateCompleteOne: function (accountId, prefix) {
    prefix = (prefix ? prefix + '_' : this.prefix ) + Date.now();
    return {
      account_id: accountId,
      managed_account_ids: [],
      key_name: prefix + ': ' + faker.lorem.words()[0],
      domains: [],
      allowed_ops: {
        read_config: true,
        modify_config: true,
        delete_config: true,
        purge: true,
        reports: true,
        admin: true
      },
      read_only_status: true,
      active: true
    };
  }
};

module.exports = APIKeyDataProvider;
