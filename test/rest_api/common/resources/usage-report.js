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

// Creating new instance of BaseResource which is going to represent the API
module.exports = new BaseResource({
  name: 'usage_report',
  idKey: null,
  path: '/usage_reports/web',
  methods: [
    Methods.READ_ALL
  ],
  nestedResources: [{
    name: 'stats',
    idKey: null,
    path: '/stats',
    methods: [
      Methods.READ_ALL
    ]
  }]
});
