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

var faker = require('faker');

// # WAF Rules Data Provider object
//
// Defines some methods to generate valid and common WAF Rules test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var WAFRuleDataProvider = {

  prefix: 'qa-test-wafrule-',

  /**
   * ### WAFRuleDataProvider.generateOne()
   *
   * Generates valid data that represents a WAF Rule and the REST API
   * end points accept.
   *
   * @param {Object} data, WAF Rule info
   * @param {String} prefix, provide a prefix if not required timestamp
   * in the name
   * @returns {Object} WAF Rule info with the following schema
   *
   *    {
   *       account_id: String,
   *       rule_name: String,
   *       rule_type: String,
   *       rule_body: String,
   *       visibility: String,
   *       comment: Strting
   *    }
   */
  generateOne: function (data, prefix) {

    if (prefix === undefined) {
      prefix = (prefix ? prefix + '_' : this.prefix ) + Date.now();
    }
    return {
      account_id: data.accountId,
      rule_name: prefix,
      rule_type: data.rule_type || 'customer',
      visibility: data.visibility || 'public',
      rule_body: data.rule_body || '# QA Test WAF Rule',
      comment: data.comment || 'QA Test'
    };
  }
};

module.exports = WAFRuleDataProvider;
