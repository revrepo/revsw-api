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

/*jslint node: true */

'use strict';

var _ = require('lodash');
var utils = require('../lib/utilities.js');
var mail = require('../lib/mail');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

/**
 * @name  sendEmailAboutUserLogin
 * @description
 *
 * @param  {[type]}   options [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
exports.sendEmailAboutUserLogin = function(options, cb) {
  var email = config.get('notify_admin_by_email_on_user_login');
  if (email !== '') {
    var mailOptions = {
      to: email,
      subject: 'Portal login event for user ' + options.user.email,
      text: 'RevAPM login event for user ' + options.user.email +
        '\n\nRemote IP address: ' + options.remoteIP +
        '\nRole: ' + options.user.role
    };

    mail.sendMail(mailOptions, function(err, data) {
      if (err) {
        logger.error('sendEmailAboutUserLogin:error: ' + JSON.stringify(err));
        cb(err);
      } else {
        logger.info('sendEmailAboutUserLogin:success' + JSON.stringify(data));
        cb(err, data);
      }
    });

  } else {
    logger.info('sendEmailAboutUserLogin');
    cb(null);
  }
};

/**
 * @name sendRevOpsEmailAboutCloseAccount
 * @description
 *
 *
 * @param  {[type]}   options [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
exports.sendRevOpsEmailAboutCloseAccount = function(options, cb) {
  var email = config.get('notify_admin_by_email_on_account_cancellation');
  if (email !== '') {
    var mailOptions = {
      to: email,
      // TODO: add more text
      subject: 'RevAPM Account Cancellation Note for account "' + options.companyName + '"',
      text: 'Account Name: "' + options.companyName + '"' + ', account ID ' + options.account_id +
        '\n\nRemote IP Address: ' + options.remoteIP +
        '\nDeleted By : ' + options.deleted_by +
        '\nCancellation Note: ' + options.cancellation_message
    };

    mail.sendMail(mailOptions, function(err, data) {
      if (err) {
        logger.error('sendRevOpsEmailAboutCloseAccount:error: ' + JSON.stringify(err));
        cb(err);
      } else {
        logger.info('sendRevOpsEmailAboutCloseAccount:success');
        cb(err, data);
      }
    });
  } else {
    logger.info('sendRevOpsEmailAboutNewSignup');
    cb(null);
  }
};

// helper function to replace all strings in a string.
// ignore because jshint complains when we add a method to String's prototype..
/* jshint ignore:start */
String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};
/* jshint ignore:end */

/**
 * @name sendInvitationEmail
 * @description Prepares and sends an invitation email to a newly created user
 *
 *
 * @param  {[type]}   options [description] email data
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
exports.sendInvitationEmail = function(options, cb) {
  var email = options.userEmail;
  var fullname = options.userFullName;
  var tokenExpire = (options.invitationExpireAt - Date.now()) * 1000 * 60; // how much hours left to expiry
  var inviteToken = options.invitationToken;
  var userId = options.userId;
  var acc = options.acc;
  if (email !== '') {
    var mailHTML = config.get('vendor_profiles')[acc.vendor_profile].user_invitation_mail_body;
    mailHTML = mailHTML.join('\n')
                       .replace('{{fullname}}', fullname)
                       .replaceAll('{{userId}}', userId)
                       .replaceAll('{{portalURL}}', options.portalUrl)
                       .replaceAll('{{inviteToken}}', inviteToken);
    var mailOptions = {
      to: email,
      subject: config.get('vendor_profiles')[acc.vendor_profile].user_invitation_mail_subject,
      html: mailHTML
    };

    mail.sendMail(mailOptions, function(err, data) {
      if (err) {
        logger.error('sendInvitationEmail:error: ' + JSON.stringify(err));
        cb(err);
      } else {
        logger.info('sendInvitationEmail:success');
        cb(err, data);
      }
    });
  } else {
    logger.info('sendInvitationEmail');
    cb(null);
  }
};