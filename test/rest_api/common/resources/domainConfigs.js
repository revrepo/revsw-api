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

// # Accounts Resource object

// Requiring config and `BaseResource`
var config = require('config');
var BaseResource = require('./base');

// Creating new instance of BaseResource which is going to represent the API
module.exports = {
  config:
    new BaseResource({
      host: config.api.host,
      apiVersion: config.api.version,
      apiResource: config.api.resources.domainConfigs
  }),
  status: //GET only
    new BaseResource({
      host: config.api.host,
      apiVersion: config.api.version,
      apiResource: config.api.resources.domainConfigs,
      ext: '/config_status'
    }),
  verify: //PUT only
    new BaseResource({
      host: config.api.host,
      apiVersion: config.api.version,
      apiResource: config.api.resources.domainConfigs,
      ext: '?options=verify_only'
    }),
  publish: //PUT only
    new BaseResource({
      host: config.api.host,
      apiVersion: config.api.version,
      apiResource: config.api.resources.domainConfigs,
      ext: '?options=publish'
    }),
};

