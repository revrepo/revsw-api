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

var boom        = require('boom');
var mongoose    = require('mongoose');
var async       = require('async');
var nodemailer  = require('nodemailer');
var config      = require('config');
var crypto      = require('crypto');
var AuditLogger = require('revsw-audit');

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var User = require('../models/User');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

//
// Password reset functions
//
exports.forgotPassword = function(request, reply) {

  var email = request.payload.email;
  users.get({
    email: email
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
    if (user) {
      if (  user.role && user.role === 'revadmin' ) {
        return reply(boom.badRequest('No account with that email address exists'));
      }

      async.waterfall([
        function(done) {
          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');
            done(err, token);
          });
        },

        function(token, done) {
          delete user.password;
          user.resetPasswordToken   = token;
          user.resetPasswordExpires = Date.now() + config.get('password_reset_token_lifespan'); // 1 hour

          users.update(user, function(error, result) {
            if (error) {
              return reply(boom.badImplementation('Failed to retrieve user details'));
            }

            result = publicRecordFields.handle(result, 'users');

            AuditLogger.store({
              ip_adress        : request.info.remoteAddress,
              datetime         : Date.now(),
              user_id          : user.user_id,
              user_name        : user.email,
              user_type        : 'user',
              account_id       : user.companyId,
              domain_id        : user.domain,
              activity_type    : 'modify',
              activity_target  : 'user',
              target_id        : result.user_id,
              target_name      : result.email,
              target_object    : result,
              operation_status : 'success'
            });

            done(error, token, user);
          });
        },

        function(token, user, done) {
          var transport = nodemailer.createTransport();
          var mailOptions = {
            to: user.email,
            from: config.get('password_reset_from_email'),
            subject: config.get('password_reset_email_subject'),
            text: 'Hello,\n\nYou are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'https://' + config.get('password_reset_portal_domain') + '/#/password/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n\n' +
            'Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.\n\n' +
            'Kind regards,\nRevAPM Customer Support Team\nhttp://www.revapm.com/\n'
          };
          transport.sendMail(mailOptions, function(err) {
            renderJSON(request, reply, error, { message: 'An e-mail has been sent to ' + user.email + ' with further instructions' } );
          });
        }

      ], function(err) {
        if (err) {
          return reply(boom.badImplementation('Failed to execute password reset procedure'));
        }
      });

    } else {
      return reply(boom.badRequest('No account with that email address exists'));
    }
  });
};



exports.checkPasswordResetToken = function(request, reply) {

  var token = request.params.token;
  users.get({
    resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() }
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve token/user details'));
    }
    if (!user) {
      return reply(boom.badRequest('The password reset token is invalid or has expired'));
    } else {
      renderJSON(request, reply, error, { message: 'The password reset token is valid' } );
    }
  });
};


exports.resetPassword = function(request, reply) {

  var token = request.params.token;
  var newPassword = request.payload.password;

  async.waterfall([
    function(done) {
      users.get({
        resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() }
      }, function(error, user) {
        if (error) {
          return reply(boom.badImplementation('Failed to retrieve token/user details'));
        }
        if (!user) {
          return reply(boom.badRequest('The password reset token is invalid or has expired'));
        }
        user.password             = newPassword;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;

        users.update( user, function(error, result) {
          if (error) {
            return reply(boom.badImplementation('Failed to update user details with new password'));
          }

          result = publicRecordFields.handle(result, 'users');

          AuditLogger.store({
            ip_adress        : request.info.remoteAddress,
            datetime         : Date.now(),
            user_id          : user.user_id,
            user_name        : user.email,
            user_type        : 'user',
            account_id       : user.companyId,
            domain_id        : user.domain,
            activity_type    : 'modify',
            activity_target  : 'user',
            target_id        : result.user_id,
            target_name      : result.email,
            target_object    : result,
            operation_status : 'success'
          });

          done(error, user);
        });
      });
    },

    function(user, done) {
      var transport = nodemailer.createTransport();
      var mailOptions = {
        to: user.email,
        from: config.get('password_reset_from_email'),
        subject: config.get('password_reset_confirmation_email_subject'),
        text: 'Hello,\n\n' +
        'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n\n' +
        'Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.\n\n' +
        'Kind regards,\nRevAPM Customer Support Team\nhttp://www.revapm.com/\n'
      };
      transport.sendMail(mailOptions, function(error) {
        renderJSON(request, reply, error, { message: 'Your password has been changed' } );
      });
    }
  ], function(err) {
    if (err) {
      return reply(boom.badImplementation('Failed to execute password reset procedure'));
    }
  });
};
