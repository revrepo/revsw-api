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
  }
};

module.exports = AppsDataProvider;