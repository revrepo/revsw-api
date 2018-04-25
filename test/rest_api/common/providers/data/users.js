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

var faker = require('faker');

// # User Data Provider object
//
// Defines some methods to generate valid and common user test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var UsersDataProvider = {

  prefix: 'test-user-',

  /**
   * ### UserDataProvider.generate()
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
   *      role: String,
   *      theme: String
   *    }
   */
  generate: function (data) {
    if (!data) data = {};
    var firstName = data.firstName || faker.name.firstName();
    var lastName = data.lastName || faker.name.lastName();
    var user = {
      firstname: firstName,
      lastname: lastName,
      email: data.email || [firstName, Date.now() + '@mailinator.com']
        .join('-')
        .toLowerCase(),
      password: 'password1',
      role: data.role || 'admin',
      theme: 'light',
      account_id: data.account_id || null
    };
    return user;
  },

  /**
   * ### UserDataProvider.generateToSignUp()
   *
   * Generates valid data that represents a user (the sign-up REST API
   * end-point accepts) that is going to be registered.
   *
   * @param {Object} data, for user to sign up
   * @returns {Object} user data.
   */
  generateToSignUp: function (data) {
    if (data === undefined) {
      data = {};
    }
    if (!data.billingPlan) {
      data.billingPlan = 'billing-plan-gold';
    }
    var firstName = data.firstName || faker.name.firstName();
    var lastName = data.lastName || faker.name.lastName();
    var email = data.email || [firstName, Date.now() + '@mailinator.com']
      .join('-')
      .toLowerCase();
    var user = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      // TODO: Commenting out below lines as the are not required for /signup2
      //company_name: faker.company.companyName(),
      //phone_number: faker.phone.phoneNumber(),
      password: 'password1',
      //passwordConfirm: 'password1',
      //address1: faker.address.streetAddress(),
      //address2: faker.address.secondaryAddress(),
      country: faker.address.country(),
      //state: faker.address.state(),
      //city: faker.address.city(),
      //zipcode: faker.address.zipCode(),
      billing_plan: data.billingPlan
    };
    return user;
  }
};

module.exports = UsersDataProvider;
