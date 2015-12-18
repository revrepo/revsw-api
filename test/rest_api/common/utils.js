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

// # Utils object
//
// Defines some common methods to use in any test script.
var Utils = {

  /**
   * ### Utils.getJsonAsKeyValueString()
   *
   * Returns a JSON object as string with following format:
   *
   *    key1=value1, key2=value2, key3=value3
   *
   * @returns {String}
   */
  getJsonAsKeyValueString: function (jsonObject) {
    return JSON
      .stringify(jsonObject)
      .replace(/\{|\}/g, '')
      .replace(/":"/g, '=')
      .replace(/","/g, ', ')
      .replace(/"/g, '');
  }
};

module.exports = Utils;