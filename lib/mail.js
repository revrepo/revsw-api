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
var nodemailer = require('nodemailer');
var config = require('config');

/**
 * Send a email using nodemailer
 * @param  {Object}   mailOptions Mail options
 * @param  {Function} [cb]
 */
exports.sendMail = function(mailOptions, cb) {
  cb = cb || _.noop;
  var transport = nodemailer.createTransport();
  if (!_.isObject(mailOptions) ||
      !_.has(mailOptions, 'to') ||
      !_.has(mailOptions, 'subject') ||
      !_.has(mailOptions, 'text')) {

    return cb(new Error('Wrong mail options'));
  }
  if (!mailOptions.from) {
    mailOptions.from = config.get('password_reset_from_email');
  }
  transport.sendMail(mailOptions, cb);
};
