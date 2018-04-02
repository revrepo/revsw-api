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

var GroupsResource = require('./../resources/groups');
var GroupsDP = require('./../providers/data/groups');
var APITestError = require('./../apiTestError');

// # Groups Helper
// Abstracts common functionality for the related resource.
var GroupsHelper = {

  /**
   * ### GroupsHelper.create()
   *
   * Creates a new group using the account ID and the data provided.
   *
   * @param {Object} data
   */
  create: function (data) {
    var group = GroupsDP.generateValid(data);
    return GroupsResource
      .createOne(group)
      .then(function (res) {
        group.id = res.body.object_id;
        return group;
      })
      .catch(function (error) {
        throw new APITestError('Creating Group', error.response.body,
          group);
      });
  },

  /**
   * Returns a list of users in a group
   *
   * @param {String} group_id
   * @returns {Promise}
   */
  getUsers: function (group_id) {
    return GroupsResource
      .getUsers(group_id)
      .then(function (res) {
        return res.body;
      });
  }
};

module.exports = GroupsHelper;