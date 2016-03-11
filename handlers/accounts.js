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
var config      = require('config');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var Account = require('../models/Account');
var User = require('../models/User');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var DomainConfig   = require('../models/DomainConfig');
var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

exports.getAccounts = function getAccounts(request, reply) {

  accounts.list(function (error, listOfAccounts) {
    if(error){
      return reply(boom.badImplementation('Failed to read accounts list from the DB'));
    }

    for (var i = 0; i < listOfAccounts.length; i++) {
      if (!utils.checkUserAccessPermissionToAccount(request, listOfAccounts[i].id)) {
        listOfAccounts.splice(i, 1);
        i--;
      }
    }

    var accounts_list = publicRecordFields.handle(listOfAccounts, 'accounts');
    renderJSON(request, reply, error, accounts_list);
  });
};

exports.createAccount = function (request, reply) {

  var newAccount = request.payload;
  newAccount.createdBy = request.auth.credentials.email;

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

      // Update the user who created the new company account with details of the new account ID
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
  var account_id = updatedAccount.account_id;
  accounts.get({ _id : account_id }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to read details for account ID ' + account_id ));
    }

    if (!result || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    accounts.update(updatedAccount, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update account ID ' + account_id ));
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
        target_id        : account_id,
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
  var account;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  // TODO: mark deleted accounts as deleted instead of actually deleting from the database

  async.waterfall([

    // TODO: add a verification that there are no active apps for an account
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
      }, function (error, account2) {
        if (error) {
          return reply(boom.badImplementation('Failed to read account details for account ID ' + account_id));
        }
        if (!account2) {
          return reply(boom.badRequest('Account ID not found'));
        }
        cb(error, account2);
      });
    },
    function (account2, cb) {
      account = account2;
      accounts.remove({
        _id : account_id
      }, function (error) {
        if (error) {
          return reply(boom.badRequest('Account ID not found'));
        }
        cb(error);
      });
    },
    function (cb) {
      // Now we need to drop the deleted account_id from companyId of all users which are managing the account
      users.listAll(request, function (error, usersToUpdate) {
        if (error) {
          return reply(boom.badImplementation('Failed to retrieve from the DB a list of all users'));
        }
        for (var i = 0; i < usersToUpdate.length; i++) {
          if (usersToUpdate[i].companyId.indexOf(account_id) === -1) {
            usersToUpdate.splice(i, 1);
            i--;
          }
        }
        cb(error, usersToUpdate);
      });
    },
    function (usersToUpdate,cb) {
      async.eachSeries(usersToUpdate, function(user, callback) {
          var user_id = user.user_id;
          if (user.companyId.lenght === 1) {
            logger.warn('Removing user ID ' + user_id + ' while removing account ID ' + account_id);
            users.remove( { user_id: user.user_id }, function (error, result) {
              if (error) {
                return reply(boom.badImplementation('Failed to delete user ID ' + user.user_id + ' while removing account ID ' + account_id));
              }
              callback(error);
            });
          } else {  /// else just update the user account and delete the account_id from companyId array
            logger.warn('Updating user ID ' + user_id + ' while removing account ID ' + account_id);
            var indexToDelete = user.companyId.indexOf(account_id);
            logger.debug('indexToDelete = ' + indexToDelete + ', account_id = ' + account_id + ', user.companyId = ' + user.companyId);
            user.companyId.splice(indexToDelete, 1);
            var updatedUser = {
              user_id   : user_id,
              companyId : user.companyId
            };

            users.update(updatedUser, function (error, result) {
              if (error) {
                return reply(boom.badImplementation('Failed to update user ID ' + user.user_id + ' while removing account ID ' + account_id));
              }
              callback(error);
            });
          }
        },
        function(error) {
          cb(error);
        });
    },
    function (cb) {
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

      renderJSON(request, reply, null, statusResponse);
    }
  ], function (err) {
    if (err) {
      return reply(boom.badImplementation('Failed to delete account ID ' + account_id));
    }
  });
};
