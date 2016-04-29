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
var config      = require('config');
var crypto      = require('crypto');
var AuditLogger = require('../lib/audit');
var logger = require('revsw-logger')(config.log_config);

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var utils           = require('../lib/utilities.js');
var mail = require('../lib/mail');

var Account = require('../models/Account');
var User = require('../models/User');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

//
// Password reset functions
//
exports.forgotPassword = function(request, reply) {

  var email = request.payload.email;

  function passwordChange(error,user){
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
          user.resetPasswordExpires = Date.now() + config.get('password_reset_token_lifespan');

          users.update(user, function(error, result) {
            if (error) {
              return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user.user_id));
            }

            result = publicRecordFields.handle(result, 'users');

            AuditLogger.store({
              ip_address       : utils.getAPIUserRealIP(request),
              datetime         : Date.now(),
              user_id          : result.user_id,
              user_name        : result.email,
              user_type        : 'user',
              account_id       : result.companyId[0],
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
          logger.info('Sending password reset email to user ' + user.email);
          mail.sendMail(mailOptions, function(err) {
            if (err) {
              return reply(boom.badImplementation('Failed to send password reset email ' + JSON.stringify(mailOptions) + ' to user ' + user.email +
                ', error message: ' + err));
            } else {
              renderJSON(request, reply, error, { message: 'An e-mail has been sent to ' + user.email + ' with further instructions' } );
            }
          });
        }

      ], function(err) {
        if (err) {
          return reply(boom.badImplementation('Failed to execute password reset procedure for email ' + email));
        }
      });
  }

  // Start work-flow
  users.get({
    email: email
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve user details for email ' + email));
    }
    if (user) {
      if (  user.role && user.role === 'revadmin' ) {
        return reply(boom.badRequest('No account with that email address exists'));
      }

      if (user.self_registered) {
          logger.info('forgotPassword::authenticate:Self Registered User whith User ID: ' + user.user_id + ' and Accont Id: ' + user.companyId);
          accounts.get({
            _id: user.companyId
          }, function(error, account) {
            if (error) {
              logger.error('forgotPassword::authenticate: Failed to find an account associated with user' +
                ' User ID: ' + user.user_id + ' Email: ' + user.email);
              return reply(boom.badImplementation('Authenticate::authenticate: Failed to find an account associated with user' +
                ' User ID: ' + user.user_id + ' Email: ' + user.email));
            }
            // NOTE: Not finished registration.
            if (account.billing_id === null || account.billing_id === '') {
              logger.error('forgotPassword::authenticate: Account associated with user' +
                ' User ID: ' + user.user_id + ' Email: ' + user.email + ' not have billing ID');

              return reply(boom.create(418, 'Your registration not finished'));
            }
            passwordChange(error,user);
          });
        }else{
            passwordChange(error,user);

        }

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
      return reply(boom.badImplementation('Failed to retrieve token/user details for token ' + token));
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
          return reply(boom.badImplementation('Failed to retrieve token/user details for token ' + token));
        }
        if (!user) {
          return reply(boom.badRequest('The password reset token is invalid or has expired'));
        }

        // TODO: need to move the password encyption function from user.update to a higher level
        user.password             = newPassword;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;

        users.update( user, function(error, result) {
          if (error) {
            return reply(boom.badImplementation('Failed to update user ' + user.email + ' with new password'));
          }

          result = publicRecordFields.handle(result, 'users');

          AuditLogger.store({
            ip_address       : utils.getAPIUserRealIP(request),
            datetime         : Date.now(),
            user_id          : user.user_id,
            user_name        : user.email,
            user_type        : 'user',
            account_id       : result.companyId[0],
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
      var mailOptions = {
        to: user.email,
        from: config.get('password_reset_from_email'),
        subject: config.get('password_reset_confirmation_email_subject'),
        text: 'Hello,\n\n' +
        'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n\n' +
        'Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.\n\n' +
        'Kind regards,\nRevAPM Customer Support Team\nhttp://www.revapm.com/\n'
      };
      logger.info('Sending password reset/change confirmation email to user ' + user.email);
      mail.sendMail(mailOptions, function(err) {
        if (err) {
          return reply(boom.badImplementation('Failed to send password reset/change confirmation email ' + JSON.stringify(mailOptions) + ' to user ' + user.email +
            ', error message: ' + err));
        } else {
         renderJSON(request, reply, err, { message: 'Your password has been changed' } );
        }
      });
    }
  ], function(err) {
    if (err) {
      return reply(boom.badImplementation('Failed to execute password reset procedure'));
    }
  });
};
