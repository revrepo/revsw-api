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

// # WAF Rules Resource object

// Requiring config and `BaseResource`
var BaseResource = require('./basic');

var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var wafRuleId = 'wafRuleId';
var resourceConfig = {
  idKey: wafRuleId,
  name: 'wafRules',
  path: '/waf_rules/{' + wafRuleId + '}',
  methods: [
    Methods.READ_ALL,
    Methods.READ_ONE,
    Methods.CREATE,
    Methods.UPDATE,
    Methods.DELETE
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `WAF Rules resource`
module.exports = new BaseResource(resourceConfig);
