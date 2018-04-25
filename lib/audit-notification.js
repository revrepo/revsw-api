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

/*jslint node: true */

'use strict';

var _ = require('lodash');
var Winston = require('winston');
var MongoDB = require('winston-mongodb').MongoDB;
var Schema = require('./audit-schema');
var Joi = require('joi');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var utils = require('../lib/utilities.js');

var mail = require('./mail.js');

var defaultSignupVendorProfile = config.get('default_signup_vendor_profile');
var vendorProfileList = config.get('vendor_profiles');
var currentVendorProfile = vendorProfileList[defaultSignupVendorProfile];
var ignoringAccounts = config.get('accounts_to_ignore_for_activity_reporting');

module.exports.sendAuditEmail = function (auditData, cb) {
  var emailNotification = config.get('notify_admin_by_email_on_customer_activities');

  if (!emailNotification || emailNotification === '') {
    cb(null, null);
    return;
  }
  // NOTE: don`t send email for ignoring accounts
  // TODO: refactoring -  use activity_target for the checks
  if ((!!auditData.account_id && (ignoringAccounts.indexOf(auditData.account_id) !== -1)) ||
    (!!auditData.target_object && !!auditData.target_object.account_id &&
      (ignoringAccounts.indexOf(auditData.target_object.account_id) !== -1)) ||
    (!!auditData.account_id && (ignoringAccounts.indexOf(auditData.account_id) !== -1)) ||
    (!!auditData.account_id && _.isObject(auditData.account_id) &&
      (ignoringAccounts.indexOf(auditData.account_id.toString()) !== -1))
  ) {
    cb(null, null);
    return;
  }
  var subjectAudit = '[Customer Activity Log][' + auditData.activity_target /*OBJECT_TYPE*/ + '][' +
    auditData.target_name /*OBJECT_NAME*/ + '][' + auditData.activity_type /*ACTION*/ + ']';

  var sendText = [
    'Audit Notification Message:',
    '{{auditData}}'
  ];

  var mailOptions = {
    to: emailNotification,
    fromname: currentVendorProfile.support_name,
    from: currentVendorProfile.support_email,
    subject: subjectAudit,
    text: sendText.join('\n')
      .replace('{{auditData}}', JSON.stringify(auditData, null, 2))
  };

  mail.sendMail(mailOptions, cb);
};
