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

// # Accounts Schema Provider Object

// Requiring Joi library to define some Schema objects
var Joi = require('joi');

// Defining common variables
var dateFormatPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
var idFormatPattern = /^([0-9]|[a-f]){24}$/;

// Defines some methods that defines the `schema` for different type of
// responses that our Accounts API returns.
//
// These schema objects are use on our test script to validate the data types
// of the results retrieved.
var AccountsResponseSP = {

  /**
   * ### AccountsResponseSP.getAccount()
   *
   * @returns {Object} Account schema as follows:
   *
   *     {
   *       companyName: {String}, // required
   *       createdBy: {String}, // required
   *       id: {String}, // required, pattern: /^([0-9]|[a-f]){24}$/
   *       created_at: {String}, // required, date-time string
   *       updated_at: {String} // required, date-time string
   *     }
   */
  getAccount: function () {
    var accountSchema = Joi.object()
      .keys({
        companyName: Joi.string().required(),
        vendor_profile: Joi.string(),
        createdBy: Joi.string().required(),
        id: Joi.string().regex(idFormatPattern).required(),
        created_at: Joi.string().regex(dateFormatPattern).required(),
        updated_at: Joi.string().regex(dateFormatPattern).required(),
        comment: Joi.string()
      });
    return accountSchema;
  }
};

module.exports = AccountsResponseSP;
