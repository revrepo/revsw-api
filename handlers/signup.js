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
var boom     = require('boom');
var async    = require('async');
var AuditLogger = require('revsw-audit');
var utils = require('../lib/utilities');
var mail = require('../lib/mail');
var config = require('config');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var User = require('../models/User');
var Location = require('../models/Location');
var BillingPlan = require('../models/BillingPlan');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

exports.signup = function(req, reply) {

  var data = req.payload;

  // Check user email address
  users.get({
    email: data.email
  }, function(err, user) {
    if (err) {
      return reply(boom.badImplementation('Failed to sugnup'));
    }

    if (user) {
      if (user.deleted) {
        return reply(boom.badRequest('User remove error'));
      }
      return reply(boom.badRequest('This email already exist in system'));
    }
    // Fetch billing plan
    BillingPlan.get({_id: data.billing_plan}, function(err, billingPlan) {
      if (err) {
        return reply(boom.badImplementation('Error fetching billing plan'));
      }
      if (!billingPlan) {
        return reply(boom.notFound('No billing plan exist in system'));
      }

      if (!data.company_name) {
        data.company_name = data.first_name + ' ' + data.last_name + '\'s Company';
      }
      var token = utils.generateToken();
      data.self_registered = true;
      data.validation = {
        expiredAt: Date.now() + config.get('user_verify_token_lifetime'),
        token: token
      };

      // All ok
      users.add(data, function(err, user) {
        if (err || !user) {
          return reply(boom.badImplementation('Could not add user'));
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
            ip_address: req.info.remoteAddress,
            datetime: Date.now(),
            //user_id: req.auth.credentials.user_id,
            //user_name: req.auth.credentials.email,
            user_type: 'user',
            account_id: user.user_id,
//          domain_id        : request.auth.credentials.domain,
            activity_type: 'add',
            activity_target: 'user',
            target_id: user.id,
            target_name: user.name,
            target_object: user,
            operation_status: 'success'
          });

          //@todo SEND REQUEST TO EBS
          var mailOptions = {
            to: user.email,
            subject: config.get('user_verify_subject'),
            text: 'Hello,\n\nYou are receiving this email because you (or someone else) have requested the creation of account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'https://' + config.get('user_verify_portal_domain') + '/#/profile/verify/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n\n' +
            'Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.\n\n' +
            'Kind regards,\nRevAPM Customer Support Team\nhttp://www.revapm.com/\n'
          };

          mail.sendMail(mailOptions, function (err, result) {
            renderJSON(req, reply, err, statusResponse);
          });
        }
      });
    });
  });

};

exports.resetToken = function(req, reply) {
  var email = req.params.email;

  users.get({
    email: email
  }, function(err, user) {
    if (err) {
      return reply(boom.badImplementation('Failed to retrieve user details by given email'));
    }
    if (!user) {
      return reply(boom.badImplementation('No user exist with such email address'));
    }
    var token = utils.generateToken();
    user.validation = {
      expiredAt: Date.now() + config.get('user_verify_token_lifetime'),
      token: token
    };
  });
};

exports.verify = function(req, reply) {
  var token = req.params.token;
  users.get({
    'validation.token': token,
    'validation.expiredAt': { $gt: Date.now() }
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve validation token/user details'));
    }
    if (!user) {
      return reply(boom.badRequest('The validation token is invalid or has expired'));
    }
    user.validation = {
      expiredAt: undefined,
      token: ''
    };
    //@todo UPDATE ANYTHING ELSE ?

    users.update( user, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update user details'));
      }

      result = publicRecordFields.handle(result, 'user');

      AuditLogger.store({
        ip_address        : req.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : user.user_id,
        user_name        : user.email,
        user_type        : 'user',
        account_id       : result.companyId,
//            domain_id        : result.domain,
        activity_type    : 'modify',
        activity_target  : 'user',
        target_id        : result.user_id,
        target_name      : result.email,
        target_object    : result,
        operation_status : 'success'
      });

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully verified your account',
        object_id: result.id
      };
      renderJSON(req, reply, error, statusResponse );
    });
  });
};
