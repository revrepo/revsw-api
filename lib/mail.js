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

'use strict';

var _ = require('lodash');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));

/**
 * Send a email using SendGrid
 * @param  {Object}   mailOptions Mail options
 * @param  {Function} [cb]
 */
exports.sendMail = function(mailOptions, cb) {
  cb = cb || _.noop;
//  logger.info('mail::sendMail: with mail options: ' + JSON.stringify(mailOptions));
  if (!_.isObject(mailOptions) ||
    !_.has(mailOptions, 'to') ||
    !_.has(mailOptions, 'subject') ||
    (!_.has(mailOptions, 'text') && !_.has(mailOptions, 'html'))) {
    logger.error('mail::sendMail:Wrong mail options');
    return cb(new Error('Wrong mail options'));
  }

  if (!mailOptions.from) {
    mailOptions.from = config.get('support_email');
  }
  if (!mailOptions.fromname) {
    mailOptions.fromname = config.get('support_name');
  }

  logger.info('sendMail:: Calling SendGrid to send the following email to user ' + mailOptions.to +
    ': ' + JSON.stringify(mailOptions));

  sendgrid.send(mailOptions, cb);

};
