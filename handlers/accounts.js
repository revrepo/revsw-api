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

var mongoose        = require('mongoose');
var boom            = require('boom');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');

var Account         = require('../models/Account');
var User            = require('../models/User');

var accounts        = new Account(mongoose, mongoConnection.getConnectionPortal());
var users           = new User(mongoose, mongoConnection.getConnectionPortal());

exports.getAccounts = function getAccounts(request, reply) {
  accounts.list(request, function(error, listOfAccounts) {
    renderJSON(request, reply, error, listOfAccounts);
  });
};

exports.createAccount = function(request, reply) {

  var newAccount = request.payload;
  newAccount.createdBy = request.auth.credentials.email;

  accounts.get({
    companyName: newAccount.companyName
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply(boom.badRequest('The company name is already registered in the system'));
    }

    accounts.add(newAccount, function(error, result) {

      if (error || !result) {
        return reply(boom.badImplementation('Failed to add new account'));
      }

      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully created new account',
          object_id: result._id.toString()
        };

        var updatedUser = {
          user_id: request.auth.credentials.user_id,
          companyId: request.auth.credentials.companyId
        };
        updatedUser.companyId.push(result._id.toString());

        users.update(updatedUser, function(error, result) {
          if (error) {
            return reply(boom.badImplementation('Failed to update user details with new account ID'));
          } else {
            renderJSON(request, reply, error, statusResponse);
          }
        });
      }
    });
  });
};

exports.getAccount = function(request, reply) {

  var account_id = request.params.account_id;

  if (request.auth.credentials.companyId.indexOf(account_id) === -1) {
    return reply(boom.badRequest('Account not found'));
  }

  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (result) {
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Account not found'));
    }
  });
};

exports.updateAccount = function(request, reply) {

  var updatedAccount = request.payload;
  updatedAccount.account_id = request.params.account_id;

  if (request.auth.credentials.companyId.indexOf(updatedAccount.account_id) === -1) {
    return reply(boom.badRequest('Account not found'));
  }

  // check that the company name is not used by another customer
  accounts.get({
    companyName: updatedAccount.companyName, _id: { $ne: request.params.account_id }
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply(boom.badRequest('The company name is already registered in the system'));
    }

    accounts.update(updatedAccount, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account'));
      }

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the account',
      };

      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteAccount = function(request, reply) {

  var account_id = request.params.account_id;

  if (request.auth.credentials.companyId.indexOf(account_id) === -1) {
    return reply(boom.badRequest('Account not found'));
  }

  accounts.remove({
    _id: account_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badRequest('Account not found'));
    }
    var statusResponse;
    statusResponse = {
      statusCode: 200,
      message: 'Successfully deleted the account'
    };

    // now let's remove the account ID from the user's companyId array
    var updatedUser = {
      user_id: request.auth.credentials.user_id,
      companyId: request.auth.credentials.companyId
    };

    updatedUser.companyId.splice(updatedUser.companyId.indexOf(account_id), 1);

    users.update(updatedUser, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update user details with removed account ID'));
      } else {
        renderJSON(request, reply, error, statusResponse);
      }
    });
  });
};
