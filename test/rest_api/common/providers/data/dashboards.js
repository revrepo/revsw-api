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

// # Dashboards Data Provider object
//
// Defines some methods to generate valid and common Dashboard. test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var DashboardDataProvider = {

  /**
   * ### DashboardDataProvider.generateOne()
   *
   * Generates valid data that represents a Dashboard which the REST API
   * end points accept.
   *
   * @returns {Object} Dashboard info with the following schema
   *
   *    {
   *      title: string,
   *      options: {
   *        stripUnknown: boolean
   *      },
   *      structure: string
   *      rows: array
   *    }
   */
  generateOne: function () {
    return {
      title: 'API QA: ' + Date.now(),
      options: {
        stripUnknown: true
      },
      structure: faker.lorem.words()[0],
      rows: []
    };
  },

  /**
   * ### DashboardDataProvider.generateCompleteOne()
   *
   * Generates valid data that represents a complete Dashboard which the
   * REST API end points accept.
   *
   * @param {String} accountId, account ID
   * @returns {Object} Dashboard info with the following schema
   *
   *    {
   *      account_id: String,
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
  generateCompleteOne: function (accountId) {
    var prefix = Date.now();
    return {
      account_id: accountId,
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

module.exports = DashboardDataProvider;