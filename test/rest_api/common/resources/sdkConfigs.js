/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

var BasicResource = require('./basic');
var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var sdkConfigKey = 'sdkConfigKey';
var resourceConfig = {
  idKey: sdkConfigKey,
  name: 'sdKConfigs',
  path: '/v1/sdk/config/{' + sdkConfigKey + '}',
  methods: [
    Methods.READ_ONE
  ],
  nestedResources: []
};

// Creating new instance of BaseResource which is going to represent the API
// `SDK Config Key`
module.exports = new BasicResource(resourceConfig);
