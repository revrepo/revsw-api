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

// # SDK Configs Resource object

// Requiring config and `BaseResource`
var config = require('config');
var BaseResource = require('./base');

// Creating new instance of BaseResource which is going to represent the API
// `SDK Config resource`
// TODO: In the future we need to improve this way of instantiation by providing
// allowed method for the resource being created.
module.exports = new BaseResource({
  host: config.api.host,
  apiVersion: config.api.version,
  apiResource: config.api.resources.sdkConfigs
});
