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

var routeConfigDP = require('./../routeConfig');

var BaseSchemaProvider = {

  /**
   * Returns the object schema related to the specified route ID
   *
   * @param routeId
   * @returns {Object} which represent the schem for the request/input and
   * response/output from the specified route ID. Structure is as follows
   *    {
   *      request: {Object} Schema,
   *      response: {Object} Schema
   *    }
   */
  get: function (routeId) {

    var config = routeConfigDP.get(routeId);

    return {
      request: config.validate,
      response: config.response.schema
    };
  }
};

module.exports = BaseSchemaProvider;
