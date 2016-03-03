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
var AuditLogger = require('revsw-audit');
var async = require('async');
var utils           = require('../lib/utilities.js');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var Account = require('../models/Account');
var User = require('../models/User');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var DomainConfig   = require('../models/DomainConfig');
var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

exports.getAccounts = function getAccounts(request, reply) {
  accounts.list(request, function (error, listOfAccounts) {
    var accounts_list = publicRecordFields.handle(listOfAccounts, 'accounts');
    renderJSON(request, reply, error, accounts_list);
  });
};

exports.createAccount = function (request, reply) {

  var newAccount = request.payload;
  newAccount.createdBy = request.auth.credentials.email;

  accounts.get({
    companyName : newAccount.companyName
  }, function (error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to read from the DB and verify new account name ' + newAccount.companyName));
    }

    if (result) {
      return reply(boom.badRequest('The company name is already registered in the system'));
    }

    accounts.add(newAccount, function (error, result) {

      if (error || !result) {
        return reply(boom.badImplementation('Failed to add new account ' + newAccount.companyName));
      }

      result = publicRecordFields.handle(result, 'account');

      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode : 200,
          message    : 'Successfully created new account',
          object_id  : result.id
        };

        AuditLogger.store({
          ip_address       : utils.getAPIUserRealIP(request),
          datetime         : Date.now(),
          user_id          : request.auth.credentials.user_id,
          user_name        : request.auth.credentials.email,
          user_type        : 'user',
          account_id       : request.auth.credentials.companyId[0],
          activity_type    : 'add',
          activity_target  : 'account',
          target_id        : result.id,
          target_name      : result.companyName,
          target_object    : result,
          operation_status : 'success'
        });

        var updatedUser = {
          user_id   : request.auth.credentials.user_id,
          companyId : request.auth.credentials.companyId
        };
        if (request.auth.credentials.role !== 'revadmin') {
          updatedUser.companyId.push(result.id);
        }

        users.update(updatedUser, function (error, result) {
          if (error) {
            return reply(boom.badImplementation('Failed to update user ID ' + updatedUser.user_id + 
              ' with details of new account IDs ' + updatedUser.companyId));
          } else {
            renderJSON(request, reply, error, statusResponse);
          }
        });
      }
    });
  });
};

exports.getAccount = function (request, reply) {

  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  accounts.get({
    _id : account_id
  }, function (error, result) {
    if (result) {
      result = publicRecordFields.handle(result, 'account');
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Account ID not found'));
    }
  });
};

exports.updateAccount = function (request, reply) {

  var updatedAccount = request.payload;
  updatedAccount.account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, updatedAccount.account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  // check that the company name is not used by another customer
  accounts.get({
    companyName : updatedAccount.companyName, _id : {$ne : request.params.account_id}
  }, function (error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply(boom.badRequest('The company name is already registered in the system'));
    }

    accounts.update(updatedAccount, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account'));
      }

      result = publicRecordFields.handle(result, 'account');

      var statusResponse = {
        statusCode : 200,
        message    : 'Successfully updated the account'
      };

      AuditLogger.store({
        ip_address       : utils.getAPIUserRealIP(request),
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId[0],
        activity_type    : 'modify',
        activity_target  : 'account',
        target_id        : request.params.account_id,
        target_name      : result.companyName,
        target_object    : result,
        operation_status : 'success'
      });

      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteAccount = function (request, reply) {

  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  async.waterfall([
    function (cb) {
      domainConfigs.query({
        'proxy_config.account_id': account_id, deleted: { $ne: true }
      }, function (error, domains) {
        if (error) {
          return reply(boom.badImplementation('Failed to verify that there are no active domains for account ID ' + account_id));
        }
        if (domains.length > 0) {
          return reply(boom.badRequest('There are active domains registered for the account - please remove the domains before removing the account'));
        }
        cb(error);
      });
    },
    function (cb) {
      accounts.get({
        _id : account_id
      }, function (error, account) {
        if (error) { 
          return reply(boom.badImplementation('Failed to read account details for account ID ' + account_id));
        }
        if (!account) {
          return reply(boom.badRequest('Account ID not found'));
        }
        cb(error, account);
      });
    },
    function (account) {
      accounts.remove({
        _id : account_id
      }, function (error) {
        if (error) {
          return reply(boom.badRequest('Account ID not found'));
        }
        var statusResponse;
        statusResponse = {
          statusCode : 200,
          message    : 'Successfully deleted the account'
        };

        account = publicRecordFields.handle(account, 'account');

        AuditLogger.store({
          ip_address       : utils.getAPIUserRealIP(request),
          datetime         : Date.now(),
          user_id          : request.auth.credentials.user_id,
          user_name        : request.auth.credentials.email,
          user_type        : 'user',
          account_id       : request.auth.credentials.companyId[0],
          activity_type    : 'delete',
          activity_target  : 'account',
          target_id        : account.id,
          target_name      : account.companyName,
          target_object    : account,
          operation_status : 'success'
        });

        // now let's remove the account ID from the user's companyId array
        var updatedUser = {
          user_id   : request.auth.credentials.user_id,
          companyId : request.auth.credentials.companyId
        };

        if (request.auth.credentials.role !== 'revadmin') {
          updatedUser.companyId.splice(updatedUser.companyId.indexOf(account_id), 1);
        }

        users.update(updatedUser, function (error, result) {
          if (error) {
            return reply(boom.badImplementation('Failed to update user details with removed account ID ' + account_id));
          } else {
            renderJSON(request, reply, error, statusResponse);
          }
        });
      });
    }
  ], function (err) {
    if (err) {
      return reply(boom.badImplementation('Failed to delete account ID ' + account_id));
    }
  });
};
