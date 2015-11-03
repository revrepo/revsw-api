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

/*jslint node: true */

'use strict';

var utils = require('./utilities');

var publicRecordFields = {

  accounts : [
    'id',
    'createdBy',
    'companyName',
    'created_at',
    'updated_at'
  ],

  account : [
    'id',
    'createdBy',
    'companyName',
    'created_at',
    'updated_at'
  ],


  apiKeys : [
    'id',
    'key',
    'key_name',
    'account_id',
    'domains',
    'created_by',
    'allowed_ops',
    'read_only_status',
    'active',
    'created_at',
    'updated_at'
  ],

  domains : [
    'id',
    'name',
    'cname',
    'companyId',
    'sync_status'
  ],

  domain : [
    'id',
    'name',
    'companyId',
    'sync_status',
    'cname',
    'origin_server',
    'tolerance',
    'origin_server_location',
    'origin_host_header',
    'created_at',
    'updated_at'
  ],

  masterConfiguration : [
    'enable_origin_health_probe',
    'origin_health_probe',
    'rev_component_co',
    'rev_component_bp'
  ],

  masterConfigurationBp : [
    'enable_cache',
    'block_crawlers',
    'cdn_overlay_urls',
    'caching_rules',
    'enable_security',
    'web_app_firewall',
    'origin_health_probe',
    'acl',
    'cache_bypass_locations'
  ],

  /*masterConfigurationCo : [
    'ssl_certificates',
    'certificate_urls',
    'bp_apache_custom_config',
    'bp_apache_fe_custom_config',
    'cache_opt_choice'
  ]*/
  purge : [
    'req_id',
    'req_domain',
    'req_email',
    'request_json'
  ],

  users : [
    'user_id',
    'email',
    'companyId',
    'domain',
    'firstname',
    'lastname',
    'role',
    'two_factor_auth_enabled'
  ],

  user : [
    'user_id',
    'email',
    'companyId',
    'domain',
    'firstname',
    'lastname',
    'role',
    'theme',
    'created_at',
    'updated_at',
    'two_factor_auth_enabled',
    'access_control_list'
  ]

};

/**
 *
 * @param data
 * @param allowFields
 * @returns {*}
 */
var handler = function (data, allowFields) {

  var result;

  if (utils.isArray(data)) {

    result = [];

    for (var i in data) {
      var obj = {};
      for (var j in allowFields) {
        if (allowFields[j] in data[i]) {
          obj[allowFields[j]] = data[i][allowFields[j]];
        }
      }
      result.push(obj);
    }

  } else {

    result = {};

    for (var o in allowFields) {
      if (allowFields[o] in data) {
        result[allowFields[o]] = data[allowFields[o]];
      }
    }

  }

  return result;
};

/**
 *
 * @param data
 * @param action
 * @returns {{}}
 */
exports.handle = function (data, action) {
  if (publicRecordFields[action]) {
    return handler(data, publicRecordFields[action]);
  } else {
    return {};
  }
};
