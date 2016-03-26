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
var config      = require('config');
var renderJSON      = require('../lib/renderJSON');

var mongoose = require('mongoose');
var boom = require('boom');
var AuditLogger = require('../lib/audit');
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

exports.webhookHandler = function (request, reply) {
  var body = request.payload;
  var payload = request.payload.payload;

  var onTest = function () {
    request.payload.msg = 'Test passed';
    reply(request.payload);
  };

  var onSignupSuccess = function () {
    return new Promise(function (resolve) {
      var subscription = payload.subscription;
      var customer = subscription.customer;

      chargify.getBillingPortalLinkAsync(customer.id)
        .then(function (link) {
          var expiresAt = Date.parse(link.expires_at);
          users.getAsync({email: customer.email})
            .then(function (user) {
              accounts.getAsync({_id: user.companyId})
                .then(function (account) {
                  var company = {
                    billing_portal_link: {url: link.url, expires_at: expiresAt},
                    account_id: account.id,
                    subscription_id: subscription.id,
                    subscription_state: subscription.state,
                    chargify_id: customer.id
                  };
                  resolve(accounts.updateAsync(company));
                });
            });
        });

    });
  };

  var onSubscriptionStateChange = function () {
    return new Promise(function (resolve) {
      var subscription = payload.subscription;
      var customer = subscription.customer;

      users.getAsync({email: customer.email})
        .then(function (user) {

          var company = {
            subscription_state: subscription.state
          };

          resolve(accounts.updateAsync(company));
        });
    });
  };

  switch (body.event) {
    case 'test':
      onTest();
      break;
    case 'signup_success':
      onSignupSuccess()
        .then(function (res) {
          reply({statusCode: 200, message: 'Signup completed'});
        })
        .catch(function (err) {
          logger.error('webhookHandler::onSignupSuccess :' + err);
        });
      break;
    case 'subscription_state_change':
      reply();
      onSubscriptionStateChange()
        .then(function (res) {
          reply({statusCode: 200, message: 'Subscription state changed'});
        })
        .catch(function (err) {
          logger.error('onSubscriptionStateChange :' + err);
        });
      break;
    default:
      reply();
  }

};
