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

var domainConfigIdKey = 'domainId';
var resourceConfig = {
  idKey: domainConfigIdKey,
  name: 'stats',
  path: '/v1/stats/waf/{' + domainConfigIdKey + '}',
  methods: [
    Methods.READ_ONE
  ],
  nestedResources: [
    {
      idKey: domainConfigIdKey,
      name: 'topObjects',
      path: '/top_objects/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      idKey: domainConfigIdKey,
      name: 'top',
      path: '/top/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      idKey: domainConfigIdKey,
      name: 'events',
      path: '/events/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
module.exports = new BaseResource(resourceConfig);
