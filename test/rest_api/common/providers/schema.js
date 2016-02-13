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

// # Schema Provider Object

// Defines some methods that defines the `schema` for different type of
// responses that our API returns.
//
// These schema objects are use on our test script to validate the data types
// of the results retrieved.

// Requiring Joi library to define some Schema objects
var Joi = require('joi');

// Defining common variables
var dateFormatPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
var idFormatPattern = /^([0-9]|[a-f]){24}$/;

// # Data Provider object
//
// Defines some methods to generate valid and common test data. With common we
// mean it oes not have anything special on it.
//
// From there, you can modify and get bugs, invalid or other type of data
// depending on your test needs.
module.exports = {

  /**
   * ### SchemaProvider.getSuccessResponse()
   *
   * @returns {Object} Success Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       message: {String}, // required
   *     }
   */
  getSuccessResponse: function () {
    var successResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        message: Joi.string().required()
      });
    return successResponseSchema;
  },

  /**
   * ### SchemaProvider.getErrorResponse()
   *
   * @returns {Object} Error Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       error: {String}, // required
   *       message: {String} // optional
   *     }
   */
  getErrorResponse: function () {
    var errorResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        error: Joi.string().required(),
        message: Joi.string()
      });
    return errorResponseSchema;
  },

  /**
   * ### SchemaProvider.getSuccessCreateResponse()
   *
   * @returns {Object} Success Create Response schema as follows:
   *
   *     {
   *       statusCode: {Number}, // required, between 100 and 599
   *       object_id: {String}, // required,
   *       message: {String} // required
   *     }
   */
  getSuccessCreateResponse: function () {
    var successCreateResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        object_id: Joi.string().regex(idFormatPattern).required(),
        message: Joi.string().required(),
      });
    return successCreateResponseSchema;
  },

  /**
   * ### SchemaProvider.getAccount()
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
        country: Joi.string(),
        createdBy: Joi.string().required(),
        id: Joi.string().regex(idFormatPattern).required(),
        created_at: Joi.string().regex(dateFormatPattern).required(),
        updated_at: Joi.string().regex(dateFormatPattern).required()
      });
    return accountSchema;
  },

  /**
   * ### SchemaProvider.getSDKConfig()
   *
   * @returns {Object} SDK config schema
   *
   */
  getSDKConfig: function() {
    var schema = Joi.object()
      .keys({
        id: Joi.string().regex(idFormatPattern).required(),
        app_name: Joi.string().required(),
        os: Joi.string().valid('iOS', 'Android').required(),
        configs: Joi.array().items(Joi.object({
          sdk_release_version: Joi.number().integer(),
          logging_level: Joi.string().valid('debug', 'info', 'warning', 'error', 'critical'),
          configuration_refresh_interval_sec: Joi.number().integer(),
          configuration_stale_timeout_sec: Joi.number().integer(),
          operation_mode: Joi.string().valid('transfer_and_report', 'transfer_only', 'report_only', 'off'),
          allowed_transport_protocols: Joi.array().items(Joi.string().valid('standard', 'quic', 'rmp')),
          initial_transport_protocol: Joi.string().valid('standard', 'quic', 'rmp'),
          stats_reporting_interval_sec: Joi.number().integer(),
          stats_reporting_level: Joi.string(),
          stats_reporting_max_requests_per_report: Joi.number().integer(),
          domains_provisioned_list: Joi.array().items(Joi.string()),
          domains_white_list: Joi.array().items(Joi.string()),
          domains_black_list: Joi.array().items(Joi.string()),
          a_b_testing_origin_offload_ratio: Joi.number().integer(),
          configuration_api_url: Joi.string(),
          configuration_request_timeout_sec: Joi.number().integer(),
          stats_reporting_url: Joi.string(),
          transport_monitoring_url: Joi.string(),
          edge_host: Joi.string()
        }))
      });
    return schema;
  }
};
