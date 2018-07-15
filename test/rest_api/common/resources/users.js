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

// # Users Resource object

// Requiring config and `BaseResource`
var BaseResource = require('./basic');
var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var userIdKey = 'userId';
var resourceConfig = {
  idKey: userIdKey,
  name: 'users',
  path: '/v1/users/{' + userIdKey + '}',
  methods: [
    Methods.READ_ALL,
    Methods.READ_ONE,
    Methods.CREATE,
    Methods.UPDATE,
    Methods.DELETE
  ],
  nestedResources: [
    {
      idKey: userIdKey,
      name: 'myself',
      path: '/myself',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      idKey: userIdKey,
      name: 'password',
      path: '/password/{' + userIdKey + '}',
      methods: [
        Methods.UPDATE
      ]
    }, {
      idKey: userIdKey,
      name: 'invitationTokenStatus',
      path: '/{' + userIdKey + '}/status',
      methods: [
        Methods.READ_ONE
      ]
    },
    {
      idKey: userIdKey,
      name: 'completeInvitation',
      path: '/{' + userIdKey + '}/complete_invitation',
      methods: [
        Methods.UPDATE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `users resource`
module.exports = new BaseResource(resourceConfig);
