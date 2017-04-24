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

var WAFRulesResource = require('./../resources/wafRules');
var WAFRulesDP = require('./../providers/data/wafRules');
var AccountsHelper = require('./../helpers/accounts');
var APITestError = require('./../apiTestError');

// # WAF Rules Helper
// Abstracts common functionality for the related resource.
var WAFRulesHelper = {
  /**
   * ### WAFRulesHelper.createOneForAccount()
   *
   * Creates a new WAF Rule for specific Account
   *
   * @returns {Object} WAF Rule data
   */
  createOneForAccount: function(account) {
    var wafRule = WAFRulesDP.generateOne({accountId: account.id});
    return WAFRulesResource
      .createOne(wafRule)
      .then(function(response) {
        wafRule.id = response.body.id;
        return wafRule;
      })
      .catch(function(error) {
        throw new APITestError('Creating WAF Rule',
          error.response.body,
          wafRule);
      });
  },
  /**
   * ### WAFRulesHelper.createOne()
   *
   * Creates a new WAR Rule
   *
   * @returns {Object} WAF Rule data
   */
  createOne: function () {
    return AccountsHelper
      .createOne()
      .then(function (account) {
        var wafRule = WAFRulesDP.generateOne({accountId:account.id});
        return WAFRulesResource
          .createOne(wafRule)
          .then(function (response) {
            wafRule.id = response.body.object_id;
            return wafRule;
          })
          .catch(function (error) {
            throw new APITestError('Creating API Key',
              error.response.body,
              wafRule);
          });
      });
  },
    /**
   * ### WAFRulesHelper.cleanup(namePattern)
   *
   * Cleans up all WAF Rules that matches with the give name pattern.
   *
   * @param {RegExp} namePattern, Regular expression for the WAF Rule name to look
   * for and delete.
   */
  cleanup: function (namePattern) {
    return WAFRulesResource
      .getAll()
      .expect(200)
      .then(function (res) {
        var ids = [];
        var WAFRules = res.body;
        WAFRules.forEach(function (wafRule) {
          if (namePattern.test(wafRule.zone)) {
            ids.push(wafRule.id);
          }
        });
        return WAFRulesResource
          .deleteManyIfExist(ids);
      });
  }
};

module.exports = WAFRulesHelper;
