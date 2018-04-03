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

var faker = require('faker');
var config = require('config');
var permissionSchema = config.permissions_schema;

// # Group Data Provider object
//
// Defines some methods to generate valid group test data.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var GroupsDataProvider = {

  prefix: 'test-group-',

  /**
   * ### GroupsDataProvider.generateValid()
   *
   * Generates valid data that represents a group and the group REST API
   * end points accept.
   *
   * @param {Object} data, group information to use, must contain account_id
   * @returns {Object} group info with the following schema
   *    {
   *      name: String,
   *      account_id: String,
   *      comment: String,
   *      permissions: Object,    
   */
  generateValid: function (data) {
    if (!data) data = {};
    
    var group = {
      name: data.name || (this.prefix + Date.now()),
      account_id: data.account_id,
      comment: data.comment || (this.prefix + 'comment'),
      permissions: data.permissions || permissionSchema
    };

    return group;
  }  
};

module.exports = GroupsDataProvider;
