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
  }
};
