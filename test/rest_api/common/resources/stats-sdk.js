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

var resourceConfig = {
  name: 'stats_sdk',
  idKey: null,
  path: '/v1/stats/sdk',
  methods: [],
  nestedResources: [{
      name: 'app',
      idKey: 'app_id',
      path: '/app/{app_id}',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      name: 'account',
      idKey: 'account_id',
      path: '/account/{account_id}',
      methods: [
        Methods.READ_ONE
      ]
    }, {
      name: 'dirs',
      idKey: null,
      path: '/dirs',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'flow',
      idKey: null,
      path: '/flow',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'agg_flow',
      idKey: null,
      path: '/agg_flow',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'top_requests',
      idKey: null,
      path: '/top_requests',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'top_users',
      idKey: null,
      path: '/top_users',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'top_gbt',
      idKey: null,
      path: '/top_gbt',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'distributions',
      idKey: null,
      path: '/distributions',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'top_objects',
      idKey: null,
      path: '/top_objects',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'top_objects_slowest',
      idKey: null,
      path: '/top_objects/slowest',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'top_objects_5xx',
      idKey: null,
      path: '/top_objects/5xx',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'ab_fbt',
      idKey: null,
      path: '/ab/fbt',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'ab_fbt_distribution',
      idKey: null,
      path: '/ab/fbt_distribution',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'ab_errors',
      idKey: null,
      path: '/ab/errors',
      methods: [
        Methods.READ_ALL
      ]
    }, {
      name: 'ab_speed',
      idKey: null,
      path: '/ab/speed',
      methods: [
        Methods.READ_ALL
      ]
    }]
};






// Creating new instance of BaseResource which is going to represent the API
module.exports = new BaseResource(resourceConfig);
