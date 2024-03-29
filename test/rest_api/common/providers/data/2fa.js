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

var speakeasy = require('speakeasy');

// # 2fa Data Provider object
//
// Defines some methods to generate valid and common 2fa test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var TwoFADP = {

  prefix: 'api-test',

  generateOneTimePassword: function (base32Key) {
    var encoding = 'base32';
    return {
      oneTimePassword: speakeasy.time({
        key: base32Key,
        encoding: encoding
      })
    };
  }
};

module.exports = TwoFADP;