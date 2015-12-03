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

// # Common Response Schema Provider Object

// Requiring Joi library to define some Schema objects
var Joi = require('joi');

// Defining common variables
var idFormatPattern = /^([0-9]|[a-f]){24}$/;

// Defines some methods that defines the `schema` for different type of
// common responses that our API returns.
//
// These schema objects are use on our test script to validate the data types
// of the results retrieved.
var CommonResponseSP = {

  /**
   * ### CommonResponseSP.getError()
   *
   * @returns {Object} Common Error Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       error: {String}, // required
   *       message: {String} // optional
   *     }
   */
  getError: function () {
    var errorResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        error: Joi.string().required(),
        message: Joi.string()
      });
    return errorResponseSchema;
  },

  /**
   * ### CommonResponseSP.getSuccess()
   *
   * @returns {Object} Common Success Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       message: {String}, // required
   *     }
   */
  getSuccess: function () {
    var successResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        message: Joi.string().required()
      });
    return successResponseSchema;
  },

  /**
   * ### CommonResponseSP.getSuccessCreate()
   *
   * @returns {Object} Common Success Create Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       object_id: {String}, // required,
   *       message: {String} // required
   *     }
   */
  getSuccessCreate: function () {
    var successCreateResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        object_id: Joi.string().regex(idFormatPattern).required(),
        message: Joi.string().required(),
      });
    return successCreateResponseSchema;
  }
};

module.exports = CommonResponseSP;