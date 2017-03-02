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
var chargifyCustomer = require('../lib/chargify').Customer;
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');

var emailService = require('../services/email.js');
var dashboardService = require('../services/dashboards.js');
var accountsService = require('../services/accounts.js');
var usersService = require('../services/users.js');


var Promise = require('bluebird');
var url = require('url');
var qs = require('qs');
var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');
var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));

var Account = require('../models/Account');
var User = require('../models/User');
var Location = require('../models/Location');

var billing_plans = require('../models/BillingPlan');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var defaultSignupVendorProfile = config.get('default_signup_vendor_profile');
var vendorProfileList = config.get('vendor_profiles');
var currentVendorProfile = vendorProfileList[defaultSignupVendorProfile];

Promise.promisifyAll(billing_plans);
Promise.promisifyAll(users);
Promise.promisifyAll(accounts);
Promise.promisifyAll(chargifyProduct);
Promise.promisifyAll(chargifyCustomer);

Promise.promisifyAll(usersService);
Promise.promisifyAll(accountsService,{multiArgs: true});

var sendVerifyToken = function(user, account, token, cb) {
  var vendorSlug = account.vendor_profile;
  var currentVendorProfile = vendorProfileList[vendorSlug];
  var mailOptions = {
    to: user.email,
    fromname: currentVendorProfile.support_name,
    from: currentVendorProfile.support_email,
    subject: currentVendorProfile.signup_user_verify_email_subject,
    text: currentVendorProfile.signup_user_verify_email_text.join('\n')
      .replace('{{vendorUrl}}', currentVendorProfile.vendorUrl)
      .replace('{{supportEmail}}', currentVendorProfile.support_email)
      .replace('{{tokenPlace}}', token)
  };
  var bccEmail = currentVendorProfile.notify_admin_by_email_on_user_self_registration;
  if (bccEmail !== '') {
    mailOptions.bcc = bccEmail;
  }
  mail.sendMail(mailOptions, cb);
};

function sendEmailForRegistration(user, account, billing_plan, cb) {
  var vendorSlug = account.vendor_profile;
  var currentVendorProfile = vendorProfileList[vendorSlug];

  var _customer_chargify = {
    first_name: user.firstname,
    last_name: user.lastname,
    email: user.email,
    phone: account.phone_number,
    reference: account.id, // NOTE: Chargify`s custoners it is our Accounts
    organization: account.companyName,
    billing_address: account.billing_info.address1,
    billing_address_2: account.billing_info.address2,
    billing_city: account.billing_info.city,
    billing_zip: account.billing_info.zipcode,
    billing_country: account.billing_info.country,
    billing_state: account.billing_info.state
  };

  var mailOptions = {
    to: user.email,
    fromname: currentVendorProfile.support_name,
    from: currentVendorProfile.support_email,
    subject: currentVendorProfile.signup_user_verify_email_subject,
    html: currentVendorProfile.signup_user_verify_email_html.join('')
        .replace('{{firstName}}', user.firstname)
        .replace('{{hosted_page}}', billing_plan.hosted_page)
        .replace('{{customer_chargify}}', qs.stringify(_customer_chargify))
        .replace('{{supportEmail}}', currentVendorProfile.support_email)
  };

  var bccEmail = currentVendorProfile.notify_admin_by_email_on_user_self_registration;
  if (bccEmail !== '') {
    mailOptions.bcc = bccEmail;
  }

  // NOTE: when we send email we do not control success or error. We only create log
  mail.sendMail(mailOptions, function(err, data) {
    if (err) {
      logger.error('sendEmailForRegistration:error: ' + JSON.stringify(err));
    }
    cb(err, data);
  });
}
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
  delete data.passwordConfirm;
  var vendorSlug = data.vendor || defaultSignupVendorProfile ;
  var vendorProfileForRegistration = vendorProfileList[vendorSlug];
  var _billing_plan = {};
  var _newAccount = {};
  var _newUser = {};

  if (!data.company_name) {
    data.company_name = data.first_name + ' ' + data.last_name + '\'s Company';
  }
  // TODO:
  if (!vendorProfileForRegistration.enable_self_registration) {
    return reply(boom.badRequest('User self-registration is temporary disabled'));
  }
  // NOTE: get internal information about Billing Plan by handler name
  users.getAsync({
      email: data.email
    })
    .then(function userValidation(user) {
      if (user) {
        logger.debug('signup:: User ' + data.email + ' already exists in the DB, record: ' + JSON.stringify(user));
        if (user.validation && user.validation.verified !== true) {
          logger.info('signup:: User ' + data.email + ' still needs to complete the registration process');
          throw {
            statusCode: 402, //
            message: 'You account is not verified. Please check your email address at \'' + data.email + '\' to finish the registration process.'
          };
        }
        if ((user.validation && user.validation.verified && user.validation.verified === true) || !user.validation) {
          logger.info('signup:: User ' + data.email + ' already exists in the system');
          throw {
            statusCode: 406,
            message: 'User with email address ' + data.email + ' already exists. Please use another email address.'
          };
        }
      }
      return billing_plans.getAsync({
        chargify_handle: data.billing_plan
      });
    })
    .then(function successCallGetBillingPlan(bp) {
      if (!bp) {
        logger.error('signup::billing_plans: Internal Billing Plan with name ' + data.billing_plan + ' is not found');
        throw new Error('Error find Billing Plan with name ' + data.billing_plan);
      } else {
        return bp;
      }
    })
    .then(function successFindInternalBullingPlan(internal_data) {
      _billing_plan = internal_data;
      // NOTE: get current Cahrgify Product Information
      return chargifyProduct
        .getHostedPageAsync(data.billing_plan)
        .then(function(billin_plan_info) {
          _billing_plan.hosted_page = billin_plan_info.url;
          return billin_plan_info;
        }, function onError(err) {
          logger.error('signup::billing_plans: External Billing Plan information for ' + data.billing_plan + ' is not found.');
          throw {
            message: 'Billing Plan \'' + data.billing_plan + '\' does not exist',
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
        },
        self_registered: true,
        vendor_profile: vendorSlug
      };
      return accountsService.createAccountAsync(newCompany, {});
    })
    .then(function createNewAdminUser(account) {
      _newAccount = publicRecordFields.handle(account, 'account');

      var newUser = {
        companyId: _newAccount.id,
        role: 'admin',
        self_registered: true,
        vendor_profile: vendorSlug,
        firstname: data.first_name,
        lastname: data.last_name,
        password: data.password,
        email: data.email
      };
      return usersService.createUserAsync(newUser).then(
        function(user) {
          _newUser = user;

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
            operation_status: 'success',
            user_id: user.user_id
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
            target_object: publicRecordFields.handle(user, 'user'),
            operation_status: 'success',
            user_id: user.user_id
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
                message: 'You account is not verified. Please check your email address at \'' + newUser.email + '\' to finish the registration process.'
              };
            }
            //
            if (dataError.user.validation.verified === true) {
              throw {
                statusCode: 406,
                message: 'User with email ' + newUser.email + ' already exists. Please use another email address.'
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
    .then(
      function sendEmailForChargifyRegistration() {
        var _customer_chargify = {
          first_name: _newUser.firstname,
          last_name: _newUser.lastname,
          email: _newUser.email,
          phone: _newAccount.phone_number,
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
            fromname: vendorProfileForRegistration.support_name,
            from: vendorProfileForRegistration.support_email,
            subject: vendorProfileForRegistration.signup_user_verify_email_subject,
            html: vendorProfileForRegistration.signup_user_verify_email_html.join('')
                .replace('{{firstName}}', _newUser.firstname)
                .replace('{{hosted_page}}', _billing_plan.hosted_page)
                .replace('{{customer_chargify}}', qs.stringify(_customer_chargify))
                .replace('{{supportEmail}}', vendorProfileForRegistration.support_email)
        };

        var bccEmail = vendorProfileForRegistration.notify_admin_by_email_on_user_self_registration;
        if (bccEmail !== '') {
          mailOptions.bcc = bccEmail;
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
      var email = vendorProfileForRegistration.notify_admin_by_email_on_user_self_registration;
      if (email !== '') {
        var mailOptions = {
          to: email,
          subject: 'Portal new signup event for user ' + _newUser.email,
          text: 'New signup event for user ' + _newUser.email +
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

};

/**
 * @name  signup2
 * @description
 *  Simple signup process
 * @param  {[type]} req   [description]
 * @param  {[type]} reply [description]
 * @return {[type]}       [description]
 */
exports.signup2 = function(req, reply) {
  var data = req.payload;
  var vendorSlug = data.vendor || defaultSignupVendorProfile ;
  var vendorProfileForRegistration = vendorProfileList[vendorSlug];
  var _billing_plan = {};
  var _newAccount = {};
  var _newUser = {};

  if (!vendorProfileForRegistration.enable_self_registration) {
    return reply(boom.badRequest('User self-registration is temporary disabled'));
  }
  if (!vendorProfileForRegistration.enable_simplified_signup_process) {
    return reply(boom.badRequest('Simple user self-registration is temporary disabled'));
  }

  // 1. Check existing user
  users.getAsync({
      email: data.email
    }).then(function userValidation(user) {
      if (user) {
        logger.debug('signup2:: User ' + data.email + ' already exists in the DB, record: ' + JSON.stringify(user));
        if (user.validation && user.validation.verified !== true) {
          logger.info('signup2:: User ' + data.email + ' still needs to complete the registration process');
          throw {
            statusCode: 402, //
            message: 'You account is not verified. Please check your email address at \'' + data.email + '\' to finish the registration process.'
          };
        }
        if ((user.validation && user.validation.verified && user.validation.verified === true) || !user.validation) {
          logger.info('signup2:: User ' + data.email + ' already exists in the system');
          throw {
            statusCode: 406,
            message: 'User with email address ' + data.email + ' already exists. Please use another email address.'
          };
        }
      }
      return billing_plans.getAsync({
        chargify_handle: data.billing_plan
      });
    })
    // NOTE: check exist Billing Plan
    .then(function successCallGetBillingPlan(bp) {
      if (!bp) {
        logger.error('signup2::billing_plans: Internal Billing Plan with name ' + data.billing_plan + ' is not found');
        throw new Error('Error find Billing Plan with name ' + data.billing_plan);
      } else {
        return bp;
      }
    })
    .then(function successFindInternalBullingPlan(internal_data) {
      _billing_plan = internal_data;
      // NOTE: get current Cahrgify Product Information
      return chargifyProduct
        .getHostedPageAsync(data.billing_plan)
        .then(function(billin_plan_info) {
          _billing_plan.hosted_page = billin_plan_info.url;
          return billin_plan_info;
        }, function onError(err) {
          logger.error('signup::billing_plans: External Billing Plan information for ' + data.billing_plan + ' is not found.');
          throw {
            message: 'Billing Plan \'' + data.billing_plan + '\' does not exist',
            statusCode: 404
          };
        });
    })
    // NOTE: create new Account for self registry User
    .then(function createNewAccount() {
      var newCompany = {
        companyName: data.company_name || data.first_name + ' ' + data.last_name,
        createdBy: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        contact_email: data.email,
        phone_number: data.phone_number,
        billing_plan: _billing_plan.id,
        address1: data.address1 || '',
        address2: data.address2 || '',
        country: data.country || '',
        state: data.state || '',
        city: data.city || '',
        zipcode: data.zipcode || '',
        billing_info: {
          first_name: data.first_name,
          last_name: data.last_name,
          contact_email: data.email,
          phone_number: data.phone_number,
          address1: data.address1 || '',
          address2: data.address2 || '',
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          zipcode: data.zipcode || ''
        },
        self_registered: true, //NOTE: Important for self registration account
        vendor_profile: vendorSlug
      };
      //    var loggerData = {
      //     user_name: newAccount.createdBy,
      //     activity_type: 'add',
      //     activity_target: 'account',
      //     operation_status: 'success',
      //     request: request
      // };
      // NOTE:
      return accountsService.createAccountAsync(newCompany, {});
    })

    // NOTE:  create new Admin User
    .then(function createNewAdminUser(account) {
      _newAccount = publicRecordFields.handle(account, 'account');

      var newUser = {
        companyId: _newAccount.id,
        role: 'admin',
        self_registered: true, // NOTE: Important for self registration user
        vendor_profile: vendorSlug,
        firstname: data.first_name,
        lastname: data.last_name,
        password: data.password,
        email: data.email
      };

      return usersService.createUserAsync(newUser)
        .then(function successUserCreated(user) {
          _newUser = user;
          logger.info('signup2:: User ' + user.email + ' created with account ID ' + _newAccount.id);
          // NOTE: not yet add information in AuditLogger. Do it after full registration complite
          return Promise.resolve(user);
        });
    })
    // NOTE:  update Admin User Data about account Id
    .then(function logSelfRegistrationOperation(user) {
        AuditLogger.store({
          ip_address: utils.getAPIUserRealIP(req),
          datetime: Date.now(),
          user_type: 'user',
          user_name: data.email,
          account_id: _newAccount.id,
          activity_type: 'signup',
          activity_target: 'account',
          target_id: _newAccount.id,
          target_name: _newAccount.companyName,
          target_object: _newAccount,
          operation_status: 'success',
          user_id: user.user_id
        });
        // TODO: user_id is not specified - we need to read the value from newUser response
        // also, the user object does not consist the whole user object - just a short status
        AuditLogger.store({
          ip_address: utils.getAPIUserRealIP(req),
          datetime: Date.now(),
          user_type: 'user',
          user_name: user.email,
          account_id: user.companyId[0],
          activity_type: 'signup',
          activity_target: 'user',
          target_id: user.user_id,
          target_name: user.email,
          target_object: publicRecordFields.handle(user, 'user'),
          operation_status: 'success',
          user_id: user.user_id
        });
        return user;
      })
    .then(function createChargifyAccount() {
      return new Promise(function(resolve, reject) {
        chargifyCustomer.createBySubscription(_newAccount, data.billing_plan, function(err, data) {
          if (err) {
            logger.error('createChargifyAccount:createBySubscription:error ' + JSON.stringify(err));
            reject(err);
          } else {
            resolve(data);
            // NOTE: Update Account - set billing_id and subscription information
            var _subscription = data.subscription;
            var _customer = _subscription.customer;
            var account = {
              account_id: _customer.reference,
              subscription_id: _subscription.id,
              subscription_state: _subscription.state,
              billing_id: _customer.id // NOTE: Billing Id = Chargify Customer Id
            };
            accounts.updateAsync(account)
              .then(function(acc) {
                // TODO: add logger result update Account
              }, function(err) {
                logger.error('createChargifyAccount:updateAccount:error ' + JSON.stringify(err));
                return;
              });
          }
        });
      });
    })
    //- Send a confirmation link by email
    .then(function sendEmailForVerifySimpleRegistration() {
      return new Promise(function(resolve, reject) {
        sendVerifyToken(_newUser, _newAccount, _newUser.validation.token, function(err, res) {
          if (err) {
            logger.error('sendEmailForSelfRegistratedUser:sendVerifyToken:error ' + JSON.stringify(err));
           }
          resolve();
        });
      });
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
      if (err.statusCode === 406 || err.statusCode === 402) {
        reply(boom.notImplemented(err.message || 'Error signup process', err));
      } else {
        reply(boom.badImplementation(err.message || 'Error signup process', err));
      }
    });
};



/**
 * @name  resendRegistrationEmail
 * @description
 *
 * Resend Email with instruction for finish registration
 *
 * Only for not verifed users
 *
 * @param  {[type]} req   [description]
 * @param  {[type]} reply [description]
 * @return {[type]}       [description]
 */
exports.resendRegistrationEmail = function(req, reply) {
  var email = req.params.email;
  var vendorSlug = defaultSignupVendorProfile ;
  var vendorProfileForRegistrationEmail = vendorProfileList[vendorSlug];
  users.getValidation({
    email: email
  }, function(err, user) {
    if (err) {
      logger.error('signup::resendRegistrationEmail:error. ' +
        'Failed to retrieve user details for email ' + email);
      return reply(boom.badImplementation('Failed to retrieve user details for email ' + email));
    }
    if (!user) {
      logger.warn('signup::resendRegistrationEmail:not found. ' +
        'No user exists with the email address ' + email);
      return reply(boom.notFound('No user exists with the email address'));
    }
    if (user.validation.verified) {
      logger.warn('signup::resendRegistrationEmail:' +
        'The email "' + email + '" is already verified. User with ID ' + user.user_id);
      return reply(boom.badRequest('The email is already verified'));
    }

    AuditLogger.store({
      ip_address: utils.getAPIUserRealIP(req),
      datetime: Date.now(),
      user_id: user.user_id,
      user_name: user.email,
      user_type: 'user',
      account_id: user.companyId[0],
      activity_type: 'modify',
      activity_target: 'user',
      target_id: user.user_id,
      target_name: user.email,
      target_object: publicRecordFields.handle(user, 'user'),
      operation_status: 'success'
    });

    var _account;
    var _billing_plan;

    accounts.getAsync({
        _id: user.companyId
      })
      .then(function(account) {
        _account = account;
        return billing_plans.getAsync({
          _id: account.billing_plan
        });
      })
      .then(function(billing_plan) {
        _billing_plan = billing_plan;

        vendorProfileForRegistrationEmail = vendorProfileList[_account.vendor_profile];
        return new Promise(function(resolve, reject) {
          // NOTE: Choose two different type registration
          if (vendorProfileForRegistrationEmail.enable_simplified_signup_process) {
            var token = utils.generateToken();
            user.validation = {
              expiredAt: Date.now() + vendorProfileForRegistrationEmail.user_verify_token_lifetime,
              token: token
            };
            // NOTE: delete not updated fields
            delete user.password;
            delete user.companyId;
            users.update(user, function(err, result) {
              if (err) {
                reject(err);
              } else {
                sendVerifyToken(result, _account, token, function sendVerifyTokenResult(err, data) {
                  // TODO: send  email to admin?
                  if (err) {
                    logger.error('resendRegistrationEmail::sendVerifyToken:error');
                  } else {
                    logger.info('resendRegistrationEmail::sendVerifyToken:success');
                  }
                });
                resolve(result);
              }
            });
          } else {
            sendEmailForRegistration(user, _account, _billing_plan, resolve);
          }
        });
      })
      .then(function() {
        var statusResponse = {
          statusCode: 200,
          message: 'Successfully sent a verification message to email address ' + user.email,
          object_id: user.id
        };
        return renderJSON(req, reply, err, statusResponse);
      })
      .catch(function(err) {
        logger.error('resendRegistrationEmail:' + JSON.stringify(err));
        reply(boom.notImplemented(err.message || 'Error signup process'));
      });

  });
};

/**
 * @name verify
 * @description
 *
 *  Verify token from registred user
 *  - return auth token (save last time login details)
 *
 * @param  {[type]} req   [description]
 * @param  {[type]} reply [description]
 * @return {[type]}       [description]
 */
exports.verify = function(req, reply) {
  var token = req.params.token;
  var remoteIP = utils.getAPIUserRealIP(req);
  // TODO: Check currentVendorProfile - need add check parameter vendor
  if (!currentVendorProfile.enable_simplified_signup_process) {
    return reply(boom.badRequest('User verification is temporary disabled'));
  }

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
    var _password = _.clone(user.password);
    // NOTE: delete not updated fields
    delete user.companyId;
    delete user.password;
    //@todo UPDATE ANYTHING ELSE ?
    accounts.get({
      _id: companyId
    }, function(err, account) {
      if (error) {
        return reply(boom.badImplementation('Signup::verify:Failed to find an account associated with user' +
          ' User ID: ' + user.id + ' Email: ' + user.email));
      }
      // Account exist - can update user information
      // TODO: duplicated code - need to move it to a separate function and call it from authenticate handler too
      user.last_login_from = remoteIP; // NOTE: save information about success login user (auto-login after verify)
      user.last_login_at = new Date();
      users.update(user, function(error, result) {
        if (error) {
          return reply(boom.badImplementation('Signup::verify: Failed to update user details.' +
            ' User ID: ' + user.id + ' Email: ' + user.email));
        }
        var _user_id = _.clone(user.user_id);
        var fields = _.merge(user, account);
        fields.hosted_page = ''; // TODO:delete - depricated
        // NOTE: send token for auto login after verify
        fields.token = utils.generateJWT({
          user_id: _user_id,
          password: _password
        });
        result = publicRecordFields.handle(fields, 'verify');
        // NOTE: user verify and auto-login
        AuditLogger.store({
          ip_address: remoteIP,
          datetime: Date.now(),
          user_id: user.user_id,
          user_name: user.email,
          user_type: 'user',
          account_id: companyId,
          activity_type: 'login', //'modify',
          activity_target: 'user',
          target_id: user.user_id,
          target_name: result.email,
          target_object: publicRecordFields.handle(fields, 'user'),
          operation_status: 'success'
        });
        emailService.sendEmailAboutUserLogin({
          user: publicRecordFields.handle(fields, 'user'),
          remoteIP: remoteIP
        }, function() {
          logger.info('signup:verify::sendEmailAboutUserLogin:');
        });

        renderJSON(req, reply, error, result);
      });
    });
  });
};
