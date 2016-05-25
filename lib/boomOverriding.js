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
var
  config = require('config'),
  boom = require('boom'),
  os = require('os'),
  mail = require('../lib/mail');

var oldBadImplementation = boom.badImplementation;

var notifyEmailBadImplementation = config.get('notify_developers_by_email_about_bad_implementation');
if (notifyEmailBadImplementation !== '') {
  // overriding Boom function
  boom.badImplementation = function(message, data) {
    var err = boom.internal(message, data, 500);
    mail.sendMail({
      from: 'eng@revsw.com',
      to: notifyEmailBadImplementation,
      subject: '[HAPI Internal Error] ' + process.env.NODE_ENV + ':' + os.hostname() + ' ' + err.message,
      text: JSON.stringify(err) + '\n\n' + err.stack
    }, function(er, data) {
      if (er) {
        console.error(er);
      }
    });
    return oldBadImplementation(message, data);
  };
}
