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

var APIKeysResource = require('./../resources/apiKeys');
var APIKeyDP = require('./../providers/data/apiKeys');
var AccountsHelper = require('./../helpers/accounts');
var APITestError = require('./../apiTestError');

// # API Keys Helper
// Abstracts common functionality for the related resource.
var APIKeysHelper = {

  /**
   * ### APIKeysHelper.createOne()
   *
   * Creates a new API Key.
   *
   * @returns {Object} API Key data.
   */
  createOne: function () {
    return AccountsHelper
      .createOne()
      .then(function (account) {
        var apiKey = APIKeyDP.generateOne(account.id);
        return APIKeysResource
          .createOneAsPrerequisite(apiKey)
          .catch(function (error) {
            throw new APITestError('Creating API Key',
              error.response.body,
              apiKey);
          })
          .then(function (respose) {
            apiKey.id = respose.body.id;
            return apiKey;
          });
      });
  }
};

module.exports = APIKeysHelper;