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

// # 2fa Resource object

var BasicResource = require('./basic');
var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var userIdKey = 'userId';
var resourceConfig = {
  idKey: userIdKey,
  name: 'twoFA',
  path: '/v1/2fa/{' + userIdKey + '}',
  nestedResources: [
    {
      idKey: userIdKey,
      name: 'disable',
      path: '/disable/{' + userIdKey + '}',
      methods: [
        Methods.CREATE
      ]
    }, {
      idKey: userIdKey,
      name: 'enable',
      path: '/enable',
      methods: [
        Methods.CREATE
      ]
    }, {
      idKey: userIdKey,
      name: 'init',
      path: '/init',
      methods: [
        Methods.READ_ONE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `purge resource`
module.exports = new BasicResource(resourceConfig);
