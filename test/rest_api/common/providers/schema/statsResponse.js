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

// # Stats Schema Provider Object

// Requiring Joi library to define some Schema objects
var Joi = require('joi');

// Defining common variables
var dateFormatPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
var idFormatPattern = /^([0-9]|[a-f]){24}$/;
var timestampPattern = /^[0-9]{13}$/;

// Defines some methods that defines the `schema` for different type of
// responses that our Stats API returns.
//
// These schema objects are use on our test script to validate the data types
// of the results retrieved.
var StatsResponseSP = {

  /**
   * ### StatsResponseSP.getStat()
   *
   * @returns {Object} Stat schema as follows:
   *
   *     {
   *       metadata: {
   *         domain_name: {String}, // required,
   *         domain_id: {String}, // required, pattern: /^([0-9]|[a-f]){24}$/
   *         start_timestamp: {Number}, // required, timestamp
   *         start_datetime: {String}, // required, date-time string
   *         end_timestamp: {Number}, // required, timestamp
   *         end_datetime: {String}, // required, date-time string
   *         total_hits: {Number}, // required
   *         filter: {String},
   *         data_points_count: {Number}, // required
   *       },
   *       data: []
   *     }
   */
  getStat: function () {
    return Joi.object()
      .keys({
        metadata: Joi.object()
          .keys({
            domain_name: Joi.string().required(),
            domain_id: Joi.string().regex(idFormatPattern).required(),
            start_timestamp: Joi.number().precision(13).required(),
            start_datetime: Joi.string().regex(dateFormatPattern).required(),
            end_timestamp: Joi.number().precision(13).required(),
            end_datetime: Joi.string().regex(dateFormatPattern).required(),
            total_hits: Joi.number().required(),
            interval_sec: Joi.number(),
            filter: Joi.string(),
            data_points_count: Joi.number().required()
          }).required(),
        data: Joi.array().required()
      });
  },

  /**
   * ### StatsResponseSP.getValidationError()
   *
   * @returns {Object} Stats Validation Error Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       error: {String}, // required
   *       message: {String} // optional
   *       validation: {
   *         source: {String}, // required
   *         keys: [
   *           cache_code {String} // required
   *         ]
   *       }
   *     }
   */
  getValidationError: function () {
    var errorResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        error: Joi.string().required(),
        message: Joi.string(),
        validation: Joi.object({
          source: Joi.string().required(),
          keys: Joi.array([
            Joi.string().required()
          ])
        }).required()
      });
    return errorResponseSchema;
  },

};

module.exports = StatsResponseSP;
