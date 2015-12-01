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

// # Accounts Data Provider object
//
// Defines some methods to generate valid and common account test data. With
// common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var AccountsDataProvider = {

  companyStr: 'API_TEST_COMPANY_',

  /**
   * ### AccountsDataProvider.generateOne()
   *
   * Generates valida data that represents an account which accounts REST API
   * end points accept.
   *
   * @param {String} prefix, a prefix value to put in the name
   *
   * @returns {Object} account info with the following schema
   *
   *     {
   *         companyName: string
   *     }
   */
  generateOne: function (prefix) {
    return {
      companyName: (prefix ? prefix + '_' : '' ) + this.companyStr + Date.now()
    };
  }
};

module.exports = AccountsDataProvider;