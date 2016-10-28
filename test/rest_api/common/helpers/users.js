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
 * from Rev Software, Inc.  accounts: AccountsHelper,
  domainConfigs: DomainConfigsHelper,
  purge: PurgeHelper,
  users: UsersHelper

 */

var UsersResource = require('./../resources/users');
var UsersDP = require('./../providers/data/users');
var APITestError = require('./../apiTestError');

// # Users Helper
// Abstracts common functionality for the related resource.
var UsersHelper = {

  /**
   * ### UsersHelper.create()
   *
   * Creates a new App using the account ID and the data provided.
   *
   * @param {Object} data, mobile app data with the following structure:
   *    {
   *      email: String,
   *      firstName: String,
   *      lastName: String
   *    }
   */
  create: function (data) {
    var user = UsersDP.generate(data);
    return UsersResource
      .createOne(user)
      .then(function (res) {
        user.id = res.body.object_id;
        return user;
      })
      .catch(function(error){
        throw new APITestError('Creating User' , error.response.body,
          user);
      });
  },

  /**
   * Returns the first company ID related to the given user.
   *
   * @param {Object} user
   * @returns {Promise} which returns the company related to the given user
   */
  getFirstCompanyId: function (user) {
    return UsersResource
      .getOne(user.id)
      .then(function (res) {
        return res.body.companyId[0];
      });
  }
};

module.exports = UsersHelper;