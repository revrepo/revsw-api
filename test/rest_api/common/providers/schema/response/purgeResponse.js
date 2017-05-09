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

// # Purge Schema Provider Object

// Requiring Joi library to define some Schema objects
var Joi = require('joi');

// Defining common variables 178ea760-ac0f-11e5-a142-31342c472eb6
var reqIdPattern = /^([0-9]|[a-f]){8}-(([0-9]|[a-f]){4}-){3}([0-9]|[a-f]){12}$/;

// Defines some methods that defines the `schema` for different type of
// responses that our Purge API returns.
//
// These schema objects are use on our test script to validate the data types
// of the results retrieved.
var PurgeResponseSP = {

  /**
   * ### PurgeResponseSP.getSuccessCreate()
   *
   * @returns {Object} Success purge create schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       request_id: {String}, // required,
   *       message: {String} // required
   *     }
   */
  getSuccessCreate: function () {
    var successCreateResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        request_id: Joi.string().regex(reqIdPattern).required(),
        message: Joi.string().required()
      });
    return successCreateResponseSchema;
  }
};

module.exports = PurgeResponseSP;
