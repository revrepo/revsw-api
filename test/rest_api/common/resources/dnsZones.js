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

// # Accounts Resource object

// Requiring config and `BaseResource`
var BaseResource = require('./basic');
var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var dnsZoneKey = 'dnsZoneId';
var resourceConfig = {
  idKey: dnsZoneKey,
  name: 'logShippingJobs',
  path: '/dns_zones/{' + dnsZoneKey + '}',
  methods: [
    Methods.CREATE,
    Methods.READ_ONE,
    Methods.READ_ALL,
    Methods.DELETE
  ],
  nestedResources: [
    {
      name: 'records',
      path: '/records',
      methods: [
        Methods.CREATE,
        Methods.DELETE_DATA
      ]
    },
    {
      name: 'usage',
      path: '/stats/usage',
      methods: [
        Methods.READ_ALL
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
module.exports = new BaseResource(resourceConfig);