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

// # SSL Config profile Resource object

// Requiring `BaseResource`
var BasicResource = require('./basic');
// Requiring constants
var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

// Config for resource
var resourceConfig = {
  idKey: null,
  name: 'sslConfProfiles',
  path: '/v1/ssl_conf_profiles',
  methods: [
    Methods.READ_ALL
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `SSL Config profile resource `

module.exports = new BasicResource(resourceConfig);
