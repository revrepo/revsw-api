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
    // err.isDeveloperError = true;
    mail.sendMail({
      from: 'eng@revsw.com',
      to: notifyEmailBadImplementation,
      subject: '[HAPI Internal Error] ' + process.env.NODE_ENV + ':' + os.hostname() + ' ' + err.message,
      text: JSON.stringify(err) + '\n\n' + err.stack
    }, function(er, data) {
      if (er) {
        console.error(er);
      }
      // process.exit(1);
    });
    return oldBadImplementation(message, data);
  };
}
