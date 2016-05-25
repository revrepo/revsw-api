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
var config = require('config');
var renderJSON = require('../lib/renderJSON');

var mongoose = require('mongoose');
var boom = require('boom');
var AuditLogger = require('../lib/audit');
var mail = require('../lib/mail');
var async = require('async');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var logger = require('revsw-logger')(config.log_config);
var Account = require('../models/Account');
var User = require('../models/User');
var chargify = require('../lib/chargify').Customer;
var Promise = require('bluebird');


var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
Promise.promisifyAll(accounts);
Promise.promisifyAll(users);
Promise.promisifyAll(chargify);

/**
 * @name webhookHandler
 * @description
 *
 * @see  https://docs.chargify.com/webhooks
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return
 */
exports.webhookHandler = function(request, reply) {
  var body = request.payload;
  var payload = request.payload.payload;

  var onTest = function() {
    request.payload.msg = 'Test passed';
    reply(request.payload);
  };
  /**
   * @onSignupSuccess
   * @description
   *
   *
   * @param  {Object} subscription - object also contains information on the Customer and Product (Chargify)
   * @return {Promise}
   */
  var onSignupSuccess = function(subscription) {
    return new Promise(function(resolve, reject) {
      var _subscription = subscription;
      var _customer = _subscription.customer;
      var account_id = _customer.reference;
      var _account = {};

      accounts.getAsync({
          _id: account_id
        })
        .then(function updateAccount(account) {
          _account = account;

          return chargify.getBillingPortalLinkAsync(_customer.id)
            .then(function(link) {
              var expiresAt = Date.parse(link.expires_at);
              var account = {
                billing_portal_link: {
                  url: link.url,
                  expires_at: expiresAt
                },
                account_id: _customer.reference,
                subscription_id: _subscription.id,
                subscription_state: _subscription.state,
                billing_id: _customer.id // NOTE: Billing Id = Chargify Customer Id
              };

              return accounts.updateAsync(account);
            });
        })
        .catch(function() {
          throw new Error('Error update Accoutn information');
        })
        .then(function findAdminUser() {
          var account_admin = {
            role: 'admin',
            companyId: account_id
          };
          return users.getValidationAsync(account_admin);
        })
        .then(function verifyAdminUser(adminUser) {
          if (config.get('enable_simplified_signup_process')) {
            // NOTE: if enable_simplified_signup_process==true - no auto verify user
            // TODO: send email admin ???
            return Promise.resolve();
          } else {
            adminUser.validation.verified = true;
            return users.updateValidationAsync(adminUser)
              .then(
                function sendWelcomeEmail() {
                  var bcc_email = config.get('notify_admin_by_email_on_user_self_registration');
                  var mailOptions = {
                    to: adminUser.email,
                    subject: config.get('user_welcome_subject'),
                    text: 'Hello ' + adminUser.firstname + ',\n\n' +
                      'We\'ve completed setting up your new RevAPM account!\n\n' +
                      'Your are welcome to visit our customer portal at https://' + config.get('user_verify_portal_domain') + '\n' +
                      'and start managing your configuration!' + '\n\n' +
                      'Should you have any questions please contact us 24x7 at ' + config.get('support_email') + '.\n\n' +
                      'Kind regards,\nRevAPM Customer Support Team\nhttp://www.revapm.com/\n'
                  };

                  if (bcc_email !== '') {
                    mailOptions.bcc = bcc_email;
                  }
                  mail.sendMail(mailOptions, function reportLog(err, data) {
                    if (err) {
                      logger.error('SendWelcomeEmail:error');
                    } else {
                      logger.info('SendWelcomeEmail:success');
                    }
                  });
                  return;
                });
          }

        })
        .catch(function errorFindAdmin(err) {
          throw new Error('Error verify Admin User');
        })
        .then(function() {
          return resolve();
        });
    });
  };
  /**
   * @name  onSubscriptionStateChange
   * @description
   *
   * @param  {Object} subscription - object also contains information on the Customer and Product (Chargify)
   * @return {Promise}
   */
  var onSubscriptionStateChange = function(subscription) {
    return new Promise(function(resolve) {
      var _subscription = subscription;
      var _customer = subscription.customer;
      // 1. Find account.subscription_id = subscription.id
      accounts.getBySubscriptionIdAsync(_subscription.id)
        .then(function updateAccountSubscriptionState(_account) {
          // NOTE: set update fields
          var _updateAccount = {
            account_id:_account.id,
            subscription_state: _subscription.state
          };
          resolve(accounts.updateAsync(_updateAccount));
        })
        .catch(function(err) {
          logger.error('OnSubscriptionStateChange:error. Subscription with ID=' + _subscription.id + ' not set state "' + _subscription.state + '"');
          throw new Error('Error update Account subscription_state for subscription_id = ' + _subscription.id);
        });
    });
  };
  /**
   *  Detected type Changify event:
   *  - signup_success
   *
   */
  switch (body.event) {
    case 'test':
      onTest();
      break;
    case 'signup_success':
      onSignupSuccess(payload.subscription)
        .then(function successSignup(res) {
          logger.info('Webhook:signup_success:success');
          reply({
            statusCode: 200,
            message: 'Signup completed'
          });
        })
        .catch(function errorSignup(err) {
          logger.error('webhookHandler::onSignupSuccess :' + err);
          reply({
            statusCode: 500,
            message: 'Error webhook \'signup_success\' '
          });
        });
      break;
    case 'subscription_state_change':
      onSubscriptionStateChange(payload.subscription)
        .then(function successSubscriptionStateChange(res) {
          logger.info('Webhook:subscription_state_change:success');
          reply({
            statusCode: 200,
            message: 'Subscription state changed'
          });
        })
        .catch(function errorSubscriptionStateChange(err) {
          logger.error('Webhook:subscription_state_change:err:' + err);
          reply({
            statusCode: 501,
            message: 'Subscription state not changed'
          });
        });
      break;
    default:
      // TODO: delete after finish testing hooks reply(boom.create(418, 'This webhook not emplemetted'));
      reply({
        statusCode: 200,
        message: 'Default'
      });
  }

};
