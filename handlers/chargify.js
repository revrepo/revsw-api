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
var renderJSON      = require('../lib/renderJSON');

var mongoose = require('mongoose');
var boom = require('boom');
var AuditLogger = require('revsw-audit');
var async = require('async');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var Account = require('../models/Account');
var User = require('../models/User');
var Promise = require('bluebird');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
Promise.promisifyAll(accounts);
Promise.promisifyAll(users);

exports.webhookHandler = function (request, reply) {
  console.log('Webhook receives a request \n' + request);
  var body = request.payload;
  var payload = request.payload.payload;


  var onTest = function () {
    reply();
  }

  var onSignupSuccess = function () {
    var subscription = payload.subscription;
    var customer = subscription.customer;
    var product = subscription.product;

    users.getAsync({email: customer.email})
      .then(function (user) {

        var company = {
          account_id: user.companyId,
          status: true,
          subscription_id: subscription.id,
          subscription_state: subscription.state,
          billing_plan: product.handle
        }

        return accounts.updateAsync(company);
      });
  }

  var onSubscriptionStateChange = function () {
    var subscription = payload.subscription;
    var customer = subscription.customer;
    var product = subscription.product;

    users.getAsync({email: customer.email})
      .then(function (user) {

        var company = {
          account_id: user.companyId,
          status: true,
          subscription_id: subscription.id,
          subscription_state: subscription.state,
          billing_plan: product.handle
        }

        return accounts.updateAsync(company);
      });
  }

  switch (body.event) {
    case 'test':
      onTest();
      break;
    case 'signup_success':
      reply();
      onSignupSuccess()
        .catch(function (err) {
          logger.error('webhookHandler::onSignupSuccess :' + err)
        });
      break;
    case 'subscription_state_change':
      reply();
      onSubscriptionStateChange()
        .catch(function (err) {
          logger.error('onSubscriptionStateChange :' + err)
        });
      break;
    default:
      reply();
  }

}