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
  path: '/v1/stats/{' + domainConfigIdKey + '}',
  methods: [
    Methods.READ_ONE
  ],
  nestedResources: [
    {
      idKey: domainConfigIdKey,
      name: 'gbt',
      path: '/gbt/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      idKey: domainConfigIdKey,
      name: 'lastMileRtt',
      path: '/lastmile_rtt/{' + domainConfigIdKey + '}',
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
      name: 'topLists',
      path: '/top_lists/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      idKey: domainConfigIdKey,
      name: 'topObjects',
      path: '/top_objects/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    },{
      idKey: domainConfigIdKey,
      name: 'imageEngine',
      path: '/imageengine/saved_bytes/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    },
    {
      idKey: domainConfigIdKey,
      name: 'mobileDesktop',
      path: '/mobile_desktop/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    },
    {
      idKey: domainConfigIdKey,
      name: 'fbtHeatmap',
      path: '/fbt/heatmap/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    },
    {
      idKey: domainConfigIdKey,
      name: 'fbtDistribution',
      path: '/fbt/distribution/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    },
    {
      idKey: domainConfigIdKey,
      name: 'fbtAverage',
      path: '/fbt/average/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    },
    {
      idKey: domainConfigIdKey,
      name: 'edgeCache',
      path: '/edge_cache/{' + domainConfigIdKey + '}',
      methods: [
        Methods.READ_ONE
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
module.exports = new BaseResource(resourceConfig);
