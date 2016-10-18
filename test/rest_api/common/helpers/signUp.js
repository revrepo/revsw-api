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

var SignUpResource = require('./../resources/signUp');
var UsersDP = require('./../providers/data/users');
var APITestError = require('./../apiTestError');

// # SignUp Helper
// Abstracts common functionality for the related resource.
module.exports = {

  /**
   * ### SignUpHelper.createOne()
   *
   * Creates a registration for a auto generated user data.
   *
   * @param {Object} data, user information to use
   * @returns {Object} user data which was registered
   */
  createOne: function (data) {
    var user = UsersDP.generateToSignUp(data);
    return SignUpResource
      .createOne(user)
      .catch(function (error) {
        throw new APITestError('Creating Account', error.response.body, user);
      })
      .then(function (res) {
        user.id = res.body.object_id;
        return user;
      });
  },

  /**
   * ### SignUpHelper.verify()
   *
   * Verifies user registration given a Token key.
   *
   * @param {String} token
   * @returns {Promise} which will return response data of the verification.
   */
  verify: function (token) {
    return SignUpResource
      .verify()
      .getOne(token);
  }
};