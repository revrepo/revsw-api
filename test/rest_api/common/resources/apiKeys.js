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

// # API Keys Resource object

// Requiring config and `BaseResource`
var BaseResource = require('./basic');

var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var apiKeyId = 'apiKeyId';
var resourceConfig = {
  idKey: apiKeyId,
  name: 'apiKeys',
  path: '/v1/api_keys/{' + apiKeyId + '}',
  methods: [
    Methods.READ_ALL,
    Methods.READ_ONE,
    Methods.CREATE,
    Methods.UPDATE,
    Methods.DELETE
  ],
  nestedResources: [
    {
      idKey: apiKeyId,
      name: 'activate',
      path: '/activate',
      methods: [
        Methods.CREATE
      ]
    },
    {
      idKey: apiKeyId,
      name: 'deactivate',
      path: '/deactivate',
      methods: [
        Methods.CREATE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `API Keys resource`
module.exports = new BaseResource(resourceConfig);
