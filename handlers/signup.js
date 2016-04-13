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
var AuditLogger = require('../lib/audit');
var utils = require('../lib/utilities');
var mail = require('../lib/mail');
var chargifyProduct = require('../lib/chargify').Product;
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');

var Promise = require('bluebird');
var url = require('url');
var qs = require('qs');
var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var Account = require('../models/Account');
var User = require('../models/User');
var Location = require('../models/Location');

var billing_plans = require('../models/BillingPlan');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

Promise.promisifyAll(billing_plans);
Promise.promisifyAll(users);
Promise.promisifyAll(accounts);
Promise.promisifyAll(chargifyProduct);

// The function is not in use anymore - TODO: delete it
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

/**
 * @name  signup
 * @description
 *
 * Signup new Admin User and create new Account
 *
 * @param  {[type]} req   [description]
 * @param  {[type]} reply [description]
 * @return {[type]}       [description]
 */
exports.signup = function(req, reply) {
  var data = req.payload;
  var _billing_plan = {};
  var _newAccount = {};
  var _newUser = {};

  if (!data.company_name) {
    data.company_name = data.first_name + ' ' + data.last_name + '\'s Company';
  }
  // TODO:
  if (!config.get('enable_self_registration')) {
    return reply(boom.badRequest('User self-registration is temporary disabled'));
  }
  // NOTE: get internal information about Billing Plan by handler name
  billing_plans.getAsync({
      chargify_handle: data.billing_plan
    })
    .then(function successCallGetBillingPlan(bp) {
      if (!bp) {
        logger.error('signup::billing_plans: Internal Billing Plan with name ' + data.billing_plan + ' not found.');
        throw new Error('Error find Billing Plan with name ' + data.billing_plan);
      } else {
        return bp;
      }
    })
    .then(function successFindInternalBullingPlan(internal_data) {
      _billing_plan = internal_data;
      // NOTE: get current Cahrgify Product Information
      // NOTE: new specific handler name - it is start with 'billing-plan-'
      return chargifyProduct
        .getHostedPageAsync(data.billing_plan)
        .then(function(billin_plan_info) {
          _billing_plan.hosted_page = billin_plan_info.url;
          return billin_plan_info;
        }, function onError(err) {
          logger.error('signup::billing_plans: External Billing Plan information for ' + data.billing_plan + ' not found.');
          throw {
            message: 'Billing Plan \'' + data.billing_plan + '\' not exist',
            statusCode: 404
          };
        });
    })
    // NOTE: create new Account
    .then(function createNewAccount() {
      var newCompany = {
        companyName: data.company_name,
        createdBy: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        contact_email: data.email,
        phone_number: data.phone_number,
        billing_plan: _billing_plan.id,
        address1: data.address1,
        address2: data.address2,
        country: data.country,
        state: data.state,
        city: data.city,
        zipcode: data.zipcode,
        billing_info: {
          first_name: data.first_name,
          last_name: data.last_name,
          contact_email: data.email,
          phone_number: data.phone_number,
          address1: data.address1,
          address2: data.address2,
          country: data.country,
          state: data.state,
          city: data.city,
          zipcode: data.zipcode
        }
      };
      return accounts.addAsync(newCompany);
    })
    .then(function createNewAdminUser(account) {
      _newAccount = publicRecordFields.handle(account, 'account');
      AuditLogger.store({
        ip_address: utils.getAPIUserRealIP(req),
        datetime: Date.now(),
        user_type: 'user',
        user_name: data.email,
        account_id: _newAccount.id,
        activity_type: 'add',
        activity_target: 'account',
        target_id: _newAccount.id,
        target_name: _newAccount.companyName,
        target_object: _newAccount,
        operation_status: 'success'
      });
      var newUser = {
        companyId: _newAccount.id,
        role: 'admin',
        firstname: data.first_name,
        lastname: data.last_name,
        password: data.password,
        email: data.email
      };
      return createUser(newUser).then(
        function(user) {
          _newUser = user;
          AuditLogger.store({
            ip_address: utils.getAPIUserRealIP(req),
            datetime: Date.now(),
            user_type: 'user',
            user_name: user.email,
            account_id: user.companyId[0],
            activity_type: 'add',
            activity_target: 'user',
            target_id: user.user_id,
            target_name: user.email,
            target_object: user,
            operation_status: 'success'
          });
          return user;
        },
        function onErrorCreateUser(dataError) {
          //NOTE:  user  not created
          if (!!dataError.user && !!dataError.user.validation) {
            // NOTE: User not verify
            if (dataError.user.validation.verified === false) {
              throw {
                statusCode: 402, //
                message: 'You account is not verified. Please check your email address \'' + newUser.email + '\' for finish registration.'
              };
            }
            //
            if (dataError.user.validation.verified === true) {
              throw {
                statusCode: 406,
                message: 'User with email ' + newUser.email + ' already exist.'
              };
            }
          } else {
            // TODO: add more detais about error
            throw {
              statusCode: 403,
              message: 'User can not be created.'
            };
          }
        });
    })
    .then(function sendEmailForChargifyRegistration() {
      var _customer_chargify = {
        first_name: _newUser.firstname,
        last_name: _newUser.lastname,
        email: _newUser.email,
        phone: _newUser.phone_number,
        reference: _newAccount.id, // NOTE: Chargify`s custoners it is our Accounts
        organization: _newAccount.companyName,
        billing_address: _newAccount.billing_info.address1,
        billing_address_2: _newAccount.billing_info.address2,
        billing_city: _newAccount.billing_info.city,
        billing_zip: _newAccount.billing_info.zipcode,
        billing_country: _newAccount.billing_info.country,
        billing_state: _newAccount.billing_info.state
      };

      var mailOptions = {
        to: _newUser.email,
        subject: config.get('user_verify_subject'),
        html: '<div style="font-family: arial,sans-serif;font-size: 1em;">' +
          '<p>Hello ' + _newUser.firstname + ',</p>' +
          '<p>You are receiving this email because you (or someone else) have requested the creation of a RevAPM account.</p>' +
          '<p>Please click on ' +
          '<a href="' + _billing_plan.hosted_page + '?' + qs.stringify(_customer_chargify) + '">this' +
          '</a> link to complete the process.' +
          '</p>' +
          '<p>If you did not request this, please ignore this email.</p>\n\n' +
          '<p>Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.</p><br><br>' +
          '<p>Kind regards,<br/>RevAPM Customer Support Team<br>http://www.revapm.com/<br/></p>' +
          '</div>'
      };

      var bcc_email = config.get('notify_admin_by_email_on_user_self_registration');
      if (bcc_email !== '') {
         mailOptions.bcc = bcc_email;
      }

      // NOTE: when we send email we do not control success or error. We only create log
      mail.sendMail(mailOptions, function(err, data) {
        if (err) {
          logger.error('Signup:SendEmailNewUser:error: ' + JSON.stringify(err));
        }
      });
      return;
    })
    // NOTE:  Send to Rev Ops an Email about new signup process
    .then(function sendRevOpsEmailAboutNewSignup() {
      var remoteIP = utils.getAPIUserRealIP(req);
      var email = config.get('notify_admin_by_email_on_user_self_registration');
      if (email !== '') {
        var mailOptions = {
          to: email,
          subject: 'Portal new signup event for user ' + _newUser.email,
          text: 'RevAPM new signup event for user ' + _newUser.email +
            '\n\nRemote IP address: ' + remoteIP +
            '\nRole: ' + _newUser.role
        };
        // NOTE: when we send email we do not control success or error. We only create log
        mail.sendMail(mailOptions, function(err, data) {
          if (err) {
            logger.error('Signup:sendRevOpsEmailAboutNewSignup:error: ' + JSON.stringify(err));
          } else {
            logger.info('Signup:sendRevOpsEmailAboutNewSignup:success');
          }
        });
      } else {
        logger.info('Signup:sendRevOpsEmailAboutNewSignup');
      }
    })
    // NOTE: Replay results signup request
    .then(function replySuccessSignUp() {
      var statusResponse = {
        statusCode: 201,
        message: 'Successfully created new user',
        object_id: _newUser.user_id
      };
      reply(statusResponse);
    })
    .catch(function replyErrorSignUp(err) {
      // TODO: detect status code
      reply(boom.notImplemented(err.message || 'Error signup process'));
    });

  /**
   * @name  createUser
   * @description
   *
   * @param  {String} email - the user's data for registration
   * @return {Promise}
   */
  function createUser(newUser) {
    return new Promise(function(resolve, reject) {
      users.getValidation({
        email: newUser.email
      }, function(err, user) {
        if (err) {
          reject(err);
        }
        if (!!user) {
          reject({
            user: user
          });
        } else {
          // TODO: start
          var token = utils.generateToken();
          newUser.self_registered = true;
          newUser.validation = {
            expiredAt: Date.now() + config.get('user_verify_token_lifetime'),
            token: token,
            verified: false
          };
          users.addAsync(newUser)
            .then(
              function(user) {
                resolve(user);
              },
              function(err) {
                reject(err);
              }
            );
        }
      });
    });
  }
};

// TODO: delete after create new test
exports.signup_todo_delete = function(req, reply) {
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
      // TODO: not sure that we use 'deleted' attribute
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
            // TODO: we must destroy the newCompany (the new Account)
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
              user_name: user.email,
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
              user_name: user.email,
              account_id: user.companyId[0],
              activity_type: 'add',
              activity_target: 'user',
              target_id: user.user_id,
              target_name: user.email,
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
    if (user.validation.verified) {
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
      account_id: result.companyId[0],
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
    var companyId = _.clone(user.companyId[0]);
    delete user.companyId;
    delete user.password;
    //@todo UPDATE ANYTHING ELSE ?

    users.update(user, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Signup::verify: Failed to update user details.' +
          ' User ID: ' + user.id + ' Email: ' + user.email));
      }
      accounts.get({
        _id: companyId
      }, function(err, account) {
        if (error) {
          return reply(boom.badImplementation('Signup::verify:Failed to find an account associated with user' +
            ' User ID: ' + user.id + ' Email: ' + user.email));
        }
        billing_plans.get({
          _id: account.billing_plan
        }, function(err, bp) {
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
