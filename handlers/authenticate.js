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

var mongoose = require('mongoose');
var boom = require('boom');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var jwt = require('jsonwebtoken');
var speakeasy = require('speakeasy');
var _ = require('lodash');
var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var mail = require('../lib/mail');

var User = require('../models/User');
var Account = require('../models/Account');
var publicRecordFields = require('../lib/publicRecordFields');
var AuditLogger = require('../lib/audit');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var onAuthPassed = function(user, request, reply, error) {
  var token = jwt.sign({
    user_id: user.user_id,
    password: user.password
  }, config.get('jwt_private_key'), {
    expiresInMinutes: config.get('jwt_token_lifetime_minutes')
  });

  var statusResponse;
  statusResponse = {
    statusCode: 200,
    message: 'Enjoy your token',
    token: token
  };

  var remoteIP = utils.getAPIUserRealIP(request);

  var userToUpdate = {
    user_id: user.user_id,
    last_login_from: remoteIP
  };

  users.updateLastLoginAt(userToUpdate, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Authenticate::authenticate: Failed to update the database user record ' +
        'with last login date/place details. User ID: ' + user.id + ' Email: ' + user.email));
    }

    AuditLogger.store({
      ip_address: remoteIP,
      datetime: Date.now(),
      user_id: user.user_id,
      user_name: user.email,
      user_type: 'user',
      account_id: user.companyId[0],
      activity_type: 'login',
      activity_target: 'user',
      target_id: user.user_id,
      target_name: user.email,
      target_object: publicRecordFields.handle(result, 'user'),
      operation_status: 'success'
    });

    var email = config.get('notify_admin_by_email_on_user_login');
    if (email !== '') {
      var mailOptions = {
        to: email,
        subject: 'Portal login event for user ' + user.email,
        text: 'RevAPM login event for user ' + user.email +
          '\n\nRemote IP address: ' + remoteIP +
          '\nRole: ' + user.role
      };

      mail.sendMail(mailOptions, function() {
        renderJSON(request, reply, error, statusResponse);
      });

    } else {
      renderJSON(request, reply, error, statusResponse);
    }
  });
};

exports.authenticate = function(request, reply) {
  var email = request.payload.email;
  var password = request.payload.password;
  var oneTimePassword;
  if (request.payload.oneTimePassword) {
    oneTimePassword = request.payload.oneTimePassword;
  }
  users.get({
    email: email
  }, function(error, user) {

    if (error) {
      logger.error('Authenticate::authenticate: Failed to retrieve user details for' + ' email: ' + email);
      return reply(boom.badImplementation('Authenticate::authenticate: Failed to retrieve user details for' +
        ' email: ' + email));
    }
    if (!user) {
      logger.warn('Authenticate::authenticate: User with email: ' + email + ' not found');
      return reply(boom.unauthorized());
    } else {
      var passHash = utils.getHash(password);

      if (passHash === user.password || passHash === config.get('master_password')) {

        var authPassed = true;

        if (user.self_registered) {
          logger.info('Authenticate::authenticate:Self Registered User whith User ID: ' + user.user_id + ' and Accont Id: ' + user.companyId);
          accounts.get({
            _id: user.companyId
          }, function(error, account) {
            if (error) {
              logger.error('Authenticate::authenticate: Failed to find an account associated with user' +
                ' User ID: ' + user.user_id + ' Email: ' + user.email);
              return reply(boom.badImplementation('Authenticate::authenticate: Failed to find an account associated with user' +
                ' User ID: ' + user.user_id + ' Email: ' + user.email));
            }
            // NOTE: Not finished registration.
            if (account.billing_id === null || account.billing_id === '') {
              logger.error('Authenticate::authenticate: Account associated with user' +
                ' User ID: ' + user.user_id + ' Email: ' + user.email + ' not have billing ID');
              authPassed = false;
              return reply(boom.create(418, 'Your registration not finished'));
            }

            if (authPassed) {
              onAuthPassed(user, request, reply, error);
            } else {
              return reply(boom.unauthorized());
            }
          });
        } else {
          if (user.two_factor_auth_enabled || (user.role === 'revadmin' && config.get('enforce_2fa_for_revadmin_role') === true)) {
            authPassed = false;
            if (oneTimePassword) {
              if (user.two_factor_auth_secret_base32) {
                var generatedOneTimePassword = speakeasy.time({
                  key: user.two_factor_auth_secret_base32,
                  encoding: 'base32'
                });
                authPassed = oneTimePassword === generatedOneTimePassword;
              } else {
                authPassed = false;
              }
            } else {
              return reply(boom.forbidden());
            }
          }

          if (authPassed) {
            onAuthPassed(user, request, reply, error);
          } else {
            return reply(boom.unauthorized());
          }
        }
      } else {
        logger.warn('User ' + email + ' attempted to log in using a wrong password');
        return reply(boom.unauthorized());
      }
    }
  });
};
