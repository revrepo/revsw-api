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
var BasicResource = require('./basic');
var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var accountIdKey = 'accountId';
var resourceConfig = {
  idKey: accountIdKey,
  name: 'accounts',
  path: '/accounts/{' + accountIdKey + '}',
  methods: [
    Methods.CREATE,
    Methods.READ_ALL,
    Methods.READ_ONE,
    Methods.UPDATE,
    Methods.DELETE
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `accounts resource`
// TODO: In the future we need to improve this way of instantiation by providing
// allowed method for the resource being created.
module.exports = new BasicResource(resourceConfig);
