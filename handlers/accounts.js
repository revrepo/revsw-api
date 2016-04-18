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
var AuditLogger = require('../lib/audit');
var async = require('async');
var utils = require('../lib/utilities.js');
var _ = require('lodash');
var config = require('config');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var Account = require('../models/Account');
var User = require('../models/User');
var BillingPlan = require('../models/BillingPlan');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var Customer = require('../lib/chargify').Customer;

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var App = require('../models/App');
var apps = new App(mongoose, mongoConnection.getConnectionPortal());

var ApiKey = require('../models/APIKey');
var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());

exports.getAccounts = function getAccounts(request, reply) {

  accounts.list(function(error, listOfAccounts) {
    if (error) {
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

exports.createAccount = function(request, reply) {

  var newAccount = request.payload;
  newAccount.createdBy = request.auth.credentials.email;

  accounts.add(newAccount, function(error, result) {

    if (error || !result) {
      return reply(boom.badImplementation('Failed to add new account ' + newAccount.companyName));
    }

    result = publicRecordFields.handle(result, 'account');

    var statusResponse;
    if (result) {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully created new account',
        object_id: result.id
      };

      AuditLogger.store({
        ip_address: utils.getAPIUserRealIP(request),
        datetime: Date.now(),
        user_id: request.auth.credentials.user_id,
        user_name: request.auth.credentials.email,
        user_type: 'user',
        account_id: request.auth.credentials.companyId[0],
        activity_type: 'add',
        activity_target: 'account',
        target_id: result.id,
        target_name: result.companyName,
        target_object: result,
        operation_status: 'success'
      });

      // Update the user who created the new company account with details of the new account ID
      var updatedUser = {
        user_id: request.auth.credentials.user_id,
        companyId: request.auth.credentials.companyId
      };
      if (request.auth.credentials.role !== 'revadmin') {
        updatedUser.companyId.push(result.id);
      }

      users.update(updatedUser, function(error, result) {
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

exports.createBillingProfile = function(request, reply) {
  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  var updateAccountInformation = function(updatedAccount, request, reply) {

    if (!updatedAccount.account_id) {
      updatedAccount.account_id = updatedAccount.id;
    }
    console.log('updateAccountInformation', updatedAccount);
    accounts.update(updatedAccount, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account'));
      }

      result = publicRecordFields.handle(result, 'account');

      var statusResponse = result;
      // {
      //   statusCode: 200,
      //   message: 'Successfully updated the account'
      // };

      AuditLogger.store({
        ip_address: utils.getAPIUserRealIP(request),
        datetime: Date.now(),
        user_id: request.auth.credentials.user_id,
        user_name: request.auth.credentials.email,
        user_type: 'user',
        account_id: request.auth.credentials.companyId[0],
        activity_type: 'modify',
        activity_target: 'account',
        target_id: request.params.account_id,
        target_name: result.companyName,
        target_object: result,
        operation_status: 'success'
      });

      renderJSON(request, reply, error, statusResponse);
    });
  };

  // get
  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (result) {
      //result = publicRecordFields.handle(result, 'account');
      Customer.create(result, function resultCreatingCustomer(error, data) {
        if (error) {
          return reply(boom.badImplementation('Failed to create billind profile '));
        }
        // Set billing_id for account
        result.billing_id = data.customer.id;
        // TODO: Can not get link for new user
        // Customer.getBillingPortalLink(result.chargify_id, function resultGetBillingPortalLink(error, link) {
        //   // if (error) {
        //   //   return reply(boom.badImplementation('Failed to create billind profile::error get managment link'));
        //   // }
        //   // result.billing_portal_link = {
        //   //   url: link.url,
        //   //   expires_at: expiresAt
        //   // };
        // })
        // result = publicRecordFields.handle(result, 'account');

        // TODO : save new information

        //data.message = 'Successfully create billing profile for the account'
        // renderJSON(request, reply, error, data);
        data = publicRecordFields.handle(result, 'account');

        // renderJSON(request, reply, error, data);
        // reply(data);
        updateAccountInformation(result, request, reply);
      });

    } else {
      return reply(boom.badRequest('Account ID not found'));
    }
  });



};

exports.getAccount = function(request, reply) {

  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (result) {
      result = publicRecordFields.handle(result, 'account');
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Account ID not found'));
    }
  });
};

exports.getAccountStatements = function(request, reply) {
  var account_id = request.params.account_id;



  accounts.get({
    _id: account_id
  }, function(error, account) {
    if (error) {
      return reply(boom.badImplementation('Accounts::getAccountStatements: Failed to get an account' +
        ' Account ID: ' + account_id));
    }
    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('No subscription registered for account.'));
    }
    Customer.getStatements(account.subscription_id, function(error, statements) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getAccountStatements: Failed to receive statements for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id));
      }
      statements = publicRecordFields.handle(statements, 'statements');
      renderJSON(request, reply, error, statements);
    });
  });

};

exports.getAccountTransactions = function(request, reply) {
  var account_id = request.params.account_id;
  accounts.get({
    _id: account_id
  }, function(error, account) {
    if (error) {
      return reply(boom.badImplementation('Accounts::getAccountStatements: Failed to get an account' +
        ' Account ID: ' + account_id));
    }
    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('No subscription registered for account.'));
    }
    Customer.getTransactions(account.subscription_id, function(error, transactions) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getAccountStatements: Failed to receive transactions for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id));
      }
      transactions = publicRecordFields.handle(transactions, 'transactions');
      renderJSON(request, reply, error, transactions);
    });
  });

};

exports.getAccountStatement = function(request, reply) {
  var account_id = request.params.account_id;

  accounts.get({
    _id: account_id
  }, function(error, account) {
    if (error) {
      return reply(boom.badImplementation('Accounts::getAccountStatement: Failed to get an account' +
        ' Account ID: ' + account_id));
    }

    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('No subscription registered for account.'));
    }

    Customer.getStatements(account.subscription_id, function(error, statements) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getAccountStatement: Failed to receive statement for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id +
          ' Statement ID: ' + request.params.statement_id));
      }

      var idx = _.findIndex(statements, {
        id: request.params.statement_id
      });

      if (idx < 0) {
        return reply(boom.badRequest('Statement ID not found'));
      }

      var statement = statements[idx];

      var payments = [];
      var transactions = [];
      statement.transactions.forEach(function(t) {
        if (t.transaction_type === 'payment') {
          payments.push(t);
        }
      });
      statement.transactions.forEach(function(t) {
        if (t.transaction_type !== 'payment') {
          transactions.push(t);
        }
      });
      statement.payments = payments;
      statement.transactions = transactions;
      statement.payments_total = payments.reduce(function(sum, p) {
        return sum + p.amount_in_cents;
      }, 0);
      var result = publicRecordFields.handle(statement, 'statement');
      renderJSON(request, reply, error, result);
    });
  });

};

exports.getPdfStatement = function(request, reply) {
  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Accounts::getPdfStatement: Permission denied for' +
      ' Account ID: ' + account_id));
  }

  accounts.get({
    _id: account_id
  }, function(error, account) {
    if (error) {
      return reply(boom.badImplementation('Accounts::getPdfStatement: Failed to get an account' +
        ' Account ID: ' + account_id));
    }

    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('Accounts::getPdfStatement: No subscription registered for account.' +
        ' Account ID: ' + account_id));
    }

    Customer.getStatements(account.subscription_id, function(error, statements) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getPdfStatement: Failed to receive statement for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id +
          ' Statement ID: ' + request.params.statement_id));
      }

      var idx = _.findIndex(statements, {
        id: request.params.statement_id
      });
      if (idx < 0) {
        return reply(boom.badRequest('Statement ID not found'));
      }
      Customer.getPdfStatement(statements[idx].id, function(error, pdf) {
        if (error) {
          return reply(boom.badImplementation('Accounts::getPdfStatement: Failed to receive statement for subscription' +
            ' Subscription ID: ' + account.subscription_id +
            ' Account ID: ' + account_id +
            ' Statement ID: ' + request.params.statement_id));
        }
        reply(pdf)
          .type('application/pdf; charset=utf-8');
      });
    });
  });

};

exports.updateAccount = function(request, reply) {

  var updateAccount = function(request, reply) {
    accounts.update(updatedAccount, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account'));
      }

      result = publicRecordFields.handle(result, 'account');

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the account'
      };

      AuditLogger.store({
        ip_address: utils.getAPIUserRealIP(request),
        datetime: Date.now(),
        user_id: request.auth.credentials.user_id,
        user_name: request.auth.credentials.email,
        user_type: 'user',
        account_id: request.auth.credentials.companyId[0],
        activity_type: 'modify',
        activity_target: 'account',
        target_id: request.params.account_id,
        target_name: result.companyName,
        target_object: result,
        operation_status: 'success'
      });

      renderJSON(request, reply, error, statusResponse);
    });
  };

  var updatedAccount = request.payload;
  updatedAccount.account_id = request.params.account_id;
  var account_id = updatedAccount.account_id;
  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to read details for account ID ' + account_id));
    }

    if (!result || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    accounts.get({
      _id: updatedAccount.account_id
    }, function(error, account) {
      if (error) {
        return reply(boom.badImplementation('Accounts::updateAccount: failed to get an account' +
          ' Account ID: ' + updatedAccount.account_id));
      }
      if (updatedAccount.billing_plan && account.subscription_id && (account.billing_plan !== updatedAccount.billing_plan)) {
        BillingPlan.get({
          _id: updatedAccount.billing_plan
        }, function(error, plan) {
          if (error) {
            return reply(boom.badRequest('Billing plan not found'));
          }
          Customer.changeProduct(account.subscription_id, plan.chargify_handle, function(error) {
            if (error) {
              return reply(boom.badImplementation('Accounts::updateAccount: failed to change Chargify product' +
                ' Account ID: ' + updatedAccount.account_id +
                ' Subscription ID: ' + account.subscription_id +
                ' Product handle: ' + plan.chargify_handle));
            }
            updateAccount(request, reply);
          });
        });
      } else {
        if (!account.billing_id || account.billing_id === '' || !account.subscription_id || account.subscription_id === '') {
          return reply(boom.badRequest('The account in not provisioned in the billing system'));
        } else {
          updateAccount(request, reply);
        }
      }
    });
  });
};

exports.deleteAccount = function(request, reply) {

  var account_id = request.params.account_id;
  var account;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  async.waterfall([
    // Verify that there are no active apps for an account
    function(cb) {
      var getAppQuery = {
        account_id: account_id,
        deleted: {
          $ne: true
        }
      };

      apps.get(getAppQuery, function(error, existing_app) {
        if (error) {
          return reply(boom.badImplementation('Failed to verify that there are no active apps for account ID ' + account_id));
        }

        if (existing_app) {
          return reply(boom.badRequest('There are active apps for the account - please remove the apps before removing the account'));
        }

        cb(error);
      });
    },
    // verify that there are no active domains for an account
    function(cb) {
      domainConfigs.query({
        'proxy_config.account_id': account_id,
        deleted: {
          $ne: true
        }
      }, function(error, domains) {
        if (error) {
          return reply(boom.badImplementation('Failed to verify that there are no active domains for account ID ' + account_id));
        }
        if (domains.length > 0) {
          return reply(boom.badRequest('There are active domains registered for the account - please remove the domains before removing the account'));
        }
        cb(error);
      });
    },
    // verify that account exists
    function(cb) {
      accounts.get({
        _id: account_id
      }, function(error, account2) {
        if (error) {
          return reply(boom.badImplementation('Failed to read account details for account ID ' + account_id));
        }
        if (!account2) {
          return reply(boom.badRequest('Account ID not found'));
        }

        account = account2;

        cb(error, account);
      });
    },
    // NOTE: Cancel subscription
    function(account, cb) {
      if (account.subscription_id) {
        Customer.cancelSubscription(account.subscription_id, function(err, data) {
          if (err) {
            // NOTE: can be to get error if try canceled subscription from anothe Cahrgify Site
            logger.error('Accoutn::deleteAccount:error ' + JSON.stringify(err));
            cb(err);
          } else {
            logger.info('Accoutn::deleteAccount:  Subscription with ID ' + account.subscription_id + ' was canceled.' + JSON.stringify(data));
            cb(err);
          }
        });
      } else {
        cb(null);
      }
    },
    // Mark account as deleted
    function(cb) {
      var deleteAccountQuery = {
        account_id: account_id,
        deleted: true,
        subscription_state: 'canceled'
      };

      accounts.update(deleteAccountQuery, function(error) {
        if (error) {
          return reply(boom.badImplementation('Failed to set delete flag to account ID ' + account_id));
        }
        cb(error);
      });
    },
    // Drop the deleted account_id from companyId of all users which are managing the account
    function(cb) {
      users.listAll(request, function(error, usersToUpdate) {
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
    function(usersToUpdate, cb) {
      async.eachSeries(usersToUpdate, function(user, callback) {
          var user_id = user.user_id;
          logger.info('User with ID ' + user_id + ' while removing account ID ' + account_id + '. Count Companies = ' +
            user.companyId.length + ' ' + JSON.stringify(user.companyId));
          if (user.companyId.length === 1) {
            logger.warn('Removing user ID ' + user_id + ' while removing account ID ' + account_id);
            users.remove({
              _id: user.user_id
            }, function(error, result) {
              if (error) {
                logger.warn('Failed to delete user ID ' + user.user_id + ' while removing account ID ' + account_id);
                return reply(boom.badImplementation('Failed to delete user ID ' + user.user_id + ' while removing account ID ' + account_id));
              }
              logger.info('Removed user ID ' + user_id + ' while removing account ID ' + account_id);
              callback(error, user);
            });
          } else { /// else just update the user account and delete the account_id from companyId array
            logger.warn('Updating user ID ' + user_id + ' while removing account ID ' + account_id);
            var indexToDelete = user.companyId.indexOf(account_id);
            logger.debug('indexToDelete = ' + indexToDelete + ', account_id = ' + account_id + ', user.companyId = ' + user.companyId);
            user.companyId.splice(indexToDelete, 1);
            var updatedUser = {
              user_id: user_id,
              companyId: user.companyId
            };

            users.update(updatedUser, function(error, result) {
              if (error) {
                return reply(boom.badImplementation('Failed to update user ID ' + user.user_id + ' while removing account ID ' + account_id));
              }
              callback(error, user);
            });
          }
        },
        function(error) {
          cb(error);
        });
    },
    // Automatically delete all API keys belonging to the account ID
    function(cb) {
      apiKeys.removeMany({
        account_id: account_id
      }, function(error) {
        if (error) {
          return reply(boom.badImplementation('Failed to delete API keys for account ID ' + account_id));
        }

        cb();
      });
    },
    // Log results and finish request
    function(cb) {
      var statusResponse;
      statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the account'
      };

      account = publicRecordFields.handle(account, 'account');

      AuditLogger.store({
        ip_address: utils.getAPIUserRealIP(request),
        datetime: Date.now(),
        user_id: request.auth.credentials.user_id,
        user_name: request.auth.credentials.email,
        user_type: 'user',
        account_id: request.auth.credentials.companyId[0],
        activity_type: 'delete',
        activity_target: 'account',
        target_id: account.id,
        target_name: account.companyName,
        target_object: account,
        operation_status: 'success'
      });

      renderJSON(request, reply, null, statusResponse);
    }
  ], function(err) {
    if (err) {
      return reply(boom.badImplementation('Failed to delete account ID ' + account_id));
    }
  });
};
