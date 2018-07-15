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

var SSLNamesResource = require('./../resources/sslNames');
var SSLNameDP = require('./../providers/data/sslNames');
var AccountsHelper = require('./../helpers/accounts');
var APITestError = require('./../apiTestError');

// # SSL Name Helper
// Abstracts common functionality for the related resource.
var SSLNamesHelper = {

  /**
   * Creates a new SSL Name.
   *
   * @returns {Object} SSL Name data.
   */
  createOne: function (account_id) {
    if (account_id) {
      var sslName = SSLNameDP.generateOne(account_id);
      return SSLNamesResource
        .createOne(sslName)
        .then(function (response) {
          sslName.id = response.body.id;
          return sslName;
        })
        .catch(function (error) {
          throw new APITestError('Creating SSL Name',
            error.response.body,
            sslName);
        });
    }  else {
      return AccountsHelper
      .createOne()
      .then(function (account) {
        var sslName = SSLNameDP.generateOne(account.id);
        return SSLNamesResource
          .createOne(sslName)
          .then(function (response) {
            sslName.id = response.body.id;
            return sslName;
          })
          .catch(function (error) {
            throw new APITestError('Creating SSL Name',
              error.response.body,
              sslName);
          });
      });
    }       
  }
};

module.exports = SSLNamesHelper;