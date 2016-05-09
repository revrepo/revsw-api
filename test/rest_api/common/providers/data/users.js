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

// # User Data Provider object
//
// Defines some methods to generate valid and common user test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var UserDataProvider = {

  prefix: 'API-TEST',

  /**
   * ### UserDataProvider.generateUser()
   *
   * Generates valid data that represents a user and the user REST API
   * end points accept.
   *
   * @param {Object} data, user information to use
   * @returns {Object} user info with the following schema
   *    {
   *      email: String,
   *      firstname: String,
   *      lastname: String,
   *      password: String,
   *      access_control_list: {
   *        dashBoard: Boolean,
   *        reports: Boolean,
   *        configure: Boolean,
   *        test: Boolean,
   *        readOnly: Boolean
   *      },
   *      role: String,
   *      theme: String
   *    }
   */
  generateOne: function (data) {
    var prefix = data.firstName ? data.firstName + '_' : '';
    var user = {
      email: prefix + 'API_TEST_USER_' + Date.now() + '@revsw.com',
      firstname: data.firstName || 'Super',
      lastname: data.lastName || 'Man',
      password: 'password1',
      access_control_list: {
        dashBoard: true,
        reports: true,
        configure: true,
        test: true,
        readOnly: true
      },
      role: data.role || 'user',
      theme: 'light'
    };
    if (data.companyId) {
      user.companyId = data.companyId;
    }
    return user;
  },

  generateOneToSignUp: function () {
    return {
      first_name: 'joi.string().min(1).max(150).trim().description(\'User first name\').required()',
      last_name: 'joi.string().min(1).max(150).trim().description(\'Last name\').required()',
      email: 'joi.string().email().description(\'Email address\').required()',
      company_name: 'joi.string().min(1).max(150).allow(\'\').trim().description(\'Company name\').optional()',
      phone_number: 'joi.string().min(1).max(30).trim().description(\'Phone number\').required()',
      password: 'joi.string().min(8).max(15).description(\'Password\').required()',
      passwordConfirm: 'joi.string().min(8).max(15).description(\'Password confirmation\').required()',
      address1: 'joi.string().min(1).max(150).trim().description(\'Address 1\').required()',
      address2: 'joi.string().min(1).max(150).allow(\'\').trim().description(\'Address 2\').optional()',
      country: 'joi.string().min(1).max(150).trim().description(\'Country\').required()',
      state: 'joi.string().min(1).max(150).trim().description(\'State\').required()',
      city: 'joi.string().min(1).max(150).trim().description(\'City\').required()',
      zipcode: 'joi.string().min(1).max(30).trim().description(\'Zip Code\').required()',
      billing_plan: 'joi.string().min(1).max(150).trim().description(\'Billing plan ID\').required()'
    };
  }
};

module.exports = UserDataProvider;