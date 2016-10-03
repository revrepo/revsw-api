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

// # SSL Names Data Provider object
//
// Defines some methods to generate valid and common SSL cert. test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var SSLNameDataProvider = {

  prefix: 'api-test',

  /**
   * ### SSLNameDataProvider.generateOne()
   *
   * Generates valid data that represents a SSL Name and the REST API
   * end points accept.
   *
   * @param {String} accountId, account ID
   * @param {String} prefix, provide a prefix if not required timestamp
   * in the name
   * @returns {Object} SSL Cert info with the following schema
   *
   *    {
   *       account_id: String,
   *       ssl_name: String,
   *       verification_method: String,
   *    }
   */
  generateOne: function (accountId, prefix) {

    if (prefix === undefined) {
      prefix = faker.lorem.word() + ' ' + Date.now();
    }
    return {
      account_id: accountId,
      ssl_name: prefix + '.monitor.revsw.net',
      verification_method: 'url'
    };
  }
};

module.exports = SSLNameDataProvider;
