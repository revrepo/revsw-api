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

var mongoose = require('mongoose');
var boom = require('boom');
var async = require('async');
var AuditLogger = require('revsw-audit');
var utils = require('../lib/utilities');
var mail = require('../lib/mail');
var config = require('config');
var _ = require('lodash');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var Account = require('../models/Account');
var User = require('../models/User');
var Location = require('../models/Location');

var billing_plans = require('../models/BillingPlan');
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var sendVerifyToken = function(user, token, cb) {
  var mailOptions = {
    to: user.email,
    subject: config.get('user_verify_subject'),
    text: 'Hello,\n\nYou are receiving this email because you (or someone else) have requested the creation of a RevAPM account.\n\n' +
      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
      'https://' + config.get('user_verify_portal_domain') + '/#/profile/verify/' + token + '\n\n' +
      'If you did not request this, please ignore this email.\n\n' +
      'Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.\n\n' +
      'Kind regards,\nRevAPM Customer Support Team\nhttp://www.revapm.com/\n'
  };

  mail.sendMail(mailOptions, cb);
};

exports.signup = function(req, reply) {

  var data = req.payload;

  if (!config.get('enable_self_registration')) {
    return reply(boom.badRequest('User self-registration is temporary disabled'));
  }

  // Check user email address
  users.get({
    email: data.email
  }, function(err, user) {
    if (err) {
      return reply(boom.badImplementation('Failed to fetch user details for email ' + data.email));
    }

    if (user) {

      // TODO: not sure that we use "deleted" attribute
      if (user.deleted) {
        return reply(boom.badRequest('User has delete flag'));
      }
      return reply(boom.badRequest('This email address already exists in the system'));
    }

    if (!data.company_name) {
      data.company_name = data.firstname + ' ' + data.lastname + '\'s Company';
    }
    var newUser = {
      firstname: data.firstname,
      lastname: data.lastname,
      password: data.password,
      role: 'admin',
      email: data.email
    };

    var newCompany = {
      companyName: data.company_name,
      createdBy: data.email,
      address1: data.address1,
      address2: data.address2,
      country: data.country,
      state: data.state,
      city: data.city,
      zipcode: data.zipcode,
      phone_number: data.phone_number,
      billing_plan: data.billing_plan
    };
    accounts.get({
      companyName: newCompany.companyName
    }, function(error, result) {

      if (error) {
        return reply(boom.badImplementation('Failed to read from the DB and verify new account name ' + newCompany.companyName));
      }

      accounts.add(newCompany, function(error, result) {

        if (error || !result) {
          return reply(boom.badImplementation('Failed to add new account ' + newCompany.companyName));
        }

        result = publicRecordFields.handle(result, 'account');

        if (result) {
          newUser.companyId = result.id;
          var token = utils.generateToken();
          newUser.self_registered = true;
          newUser.validation = {
            expiredAt: Date.now() + config.get('user_verify_token_lifetime'),
            token: token
          };
          // All ok
          users.add(newUser, function(err, user) {
            if (err || !user) {
              return reply(boom.badImplementation('Could not create new user ' + JSON.stringify(newUser)));
            }

            var statusResponse;
            if (user) {
              statusResponse = {
                statusCode: 200,
                message: 'Successfully created new user',
                object_id: user.id
              };

              user = publicRecordFields.handle(user, 'user');

              AuditLogger.store({
                ip_address: utils.getAPIUserRealIP(req),
                datetime: Date.now(),
                user_type: 'user',
                account_id: result.id,
                activity_type: 'add',
                activity_target: 'account',
                target_id: result.id,
                target_name: result.companyName,
                target_object: result,
                operation_status: 'success'
              });

              AuditLogger.store({
                ip_address: utils.getAPIUserRealIP(req),
                datetime: Date.now(),
                user_type: 'user',
                account_id: user.companyId,
                activity_type: 'add',
                activity_target: 'user',
                target_id: user.id,
                target_name: user.name,
                target_object: user,
                operation_status: 'success'
              });
              sendVerifyToken(user, token, function(err, res) {
                renderJSON(req, reply, err, statusResponse);
              });
            }
          });
        }
      });
    });
  });

};

exports.resetToken = function(req, reply) {
  var email = req.params.email;

  users.getValidation({
    email: email
  }, function(err, user) {
    if (err) {
      return reply(boom.badImplementation('Failed to retrieve user details for email ' + email));
    }
    if (!user) {
      return reply(boom.badImplementation('No user exists with the email address'));
    }
    if(user.validation.verified){
      return reply(boom.badRequest('The email is already verified'));
    }
    var token = utils.generateToken();
    user.validation = {
      expiredAt: Date.now() + config.get('user_verify_token_lifetime'),
      token: token
    };

    var result = publicRecordFields.handle(result, 'user');

    AuditLogger.store({
      ip_address: utils.getAPIUserRealIP(req),
      datetime: Date.now(),
      user_id: user.user_id,
      user_name: user.email,
      user_type: 'user',
      account_id: result.companyId,
      activity_type: 'modify',
      activity_target: 'user',
      target_id: result.user_id,
      target_name: result.email,
      target_object: result,
      operation_status: 'success'
    });

    var statusResponse = {
      statusCode: 200,
      message: 'Successfully sent token to specified email',
      object_id: result.id
    };

    users.update(user, function(err, result) {
      sendVerifyToken(user, token, function(err, res) {
        renderJSON(req, reply, err, statusResponse);
      });
    });
  });
};

exports.verify = function(req, reply) {
  var token = req.params.token;
  users.get({
    'validation.token': token,
    'validation.expiredAt': {
      $gt: Date.now()
    }
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve validation token/user details for token ' + token));
    }
    if (!user) {
      return reply(boom.badRequest('The validation token is invalid or has expired'));
    }
    user.validation = {
      expiredAt: undefined,
      token: '',
      verified: true
    };
    var companyId = _.clone(user.companyId);
    delete user.companyId;
    delete user.password;
    //@todo UPDATE ANYTHING ELSE ?

    users.update(user, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Signup::verify: Failed to update user details.' +
          ' User ID: ' + user.id + ' Email: ' + user.email));
      }
      accounts.get({_id: companyId}, function (err, account) {
        if (error) {
          return reply(boom.badImplementation('Signup::verify:Failed to find an account associated with user' +
            ' User ID: ' + user.id + ' Email: ' + user.email));
        }
        billing_plans.get({_id: account.billing_plan}, function (err, bp) {
          if (error) {
            return reply(boom.badImplementation('Signup::verify: Failed to find a billing plan associated with account provided' +
              ' Account ID: ' + account.id + ' CreatedBy: ' + account.createdBy));
          }
          var fields = _.merge(user, account);
          fields.hosted_page = bp.hosted_page;
          result = publicRecordFields.handle(fields, 'verify');

          AuditLogger.store({
            ip_address: utils.getAPIUserRealIP(req),
            datetime: Date.now(),
            user_id: user.user_id,
            user_name: user.email,
            user_type: 'user',
            account_id: companyId,
            activity_type: 'modify',
            activity_target: 'user',
            target_id: result.user_id,
            target_name: result.email,
            target_object: result,
            operation_status: 'success'
          });

          renderJSON(req, reply, error, result);
        });
      });
    });
  });
};
