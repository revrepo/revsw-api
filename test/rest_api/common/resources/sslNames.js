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

// # SSL Certificates Resource object

// Requiring config and `BaseResource`
var BaseResource = require('./basic');

var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var sslNameIdKey = 'sslNameId';
var resourceConfig = {
  idKey: sslNameIdKey,
  name: 'sslNames',
  path: '/ssl_names/{' + sslNameIdKey + '}',
  methods: [
    Methods.READ_ALL,
    Methods.READ_ONE,
    Methods.CREATE,
    Methods.DELETE
  ],
  nestedResources: [
    {
      idKey: null,
      name: 'approvers',
      path: '/approvers?ssl_name=wwww3.revsw.com',
      methods: [
        Methods.READ_ALL
      ]
    },
    {
      idKey: sslNameIdKey,
      name: 'verify',
      path: '/verify',
      methods: [
        Methods.READ_ONE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `SSL Certificates resource`
module.exports = new BaseResource(resourceConfig);
