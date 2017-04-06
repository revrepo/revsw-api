/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
  name: 'dnsZones',
  path: '/dns_zones/{' + dnsZoneKey + '}',
  methods: [
    Methods.CREATE,
    Methods.READ_ONE,
    Methods.READ_ALL,
    Methods.UPDATE,
    Methods.DELETE
  ],
  nestedResources: [
    {
      name: 'records',
      path: '/records',
      methods: [
        Methods.CREATE,
        Methods.READ_ONE,
        Methods.READ_ALL,
        Methods.UPDATE,
        Methods.DELETE,
        Methods.DELETE_DATA // TODO: Do we still need this?
      ]
    },
    {
      name: 'checkIntegration',
      path: '/checkintegration',
      methods: [],
      nestedResources: [
        {
          name: 'dnsServers',
          path: '/dns_servers',
          methods: [
            Methods.READ_ALL
          ]
        },
        {
          name: 'records',
          path: '/records',
          methods: [
            Methods.READ_ALL
          ]
        }
      ]
    },
    {
      name: 'usage',
      path: '/stats/usage',
      methods: [
        Methods.READ_ALL
      ]
    },
    {
      name: 'stats_usage',
      path: '/stats/usage',
      methods: [
        Methods.READ_ONE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
module.exports = new BaseResource(resourceConfig);
