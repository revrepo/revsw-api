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
var mail = require('../lib/mail');
var moment = require('moment');
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

var accountService = require('../services/accounts.js');

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
  newAccount.createdBy = utils.generateCreatedByField(request);

  // TODO: Make it able to use user_type apikey to create accounts
  if (request.auth.credentials.user_type === 'apikey') {
    return reply(boom.badRequest('Cannot create account with API key'));
  }

  // Update the user who created the new company account with details of the new account ID
  var updatedUser = {
    user_id: request.auth.credentials.user_id,
    companyId: utils.getAccountID(request)
  };

  users.get({ _id: updatedUser.user_id }, function(error, user) {
    if (error || !user) {
      return reply(boom.badImplementation('Failed to get user ' + updatedUser.user_id));
    }
    if ((user.role === 'admin' || user.role === 'user') && user.companyId.length !== 0) {
      return reply(boom.badRequest('Cannot assign more, than one account to the user'));
    }

    var loggerData = {
      user_name: newAccount.createdBy,
      activity_type: 'add',
      activity_target: 'account',
      operation_status: 'success',
      request: request
    };

    accountService.createAccount(newAccount, { loggerData: loggerData }, function(err, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to add new account ' + newAccount.companyName));
      }

      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully created new account',
          object_id: result.id
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
  });
};
/**
 * @name  createBillingProfile
 * @description
 *
 *    Create Chargify Customer
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.createBillingProfile = function(request, reply) {
  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  var updateAccountInformation = function(updatedAccount, request, reply) {

    if (!updatedAccount.account_id) {
      updatedAccount.account_id = updatedAccount.id;
    }

    accounts.update(updatedAccount, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account', error));
      }

      result = publicRecordFields.handle(result, 'account');

      var statusResponse = result;
      // {
      //   statusCode: 200,
      //   message: 'Successfully updated the account'
      // };

      AuditLogger.store({
        activity_type: 'modify',
        activity_target: 'account',
        target_id: request.params.account_id,
        target_name: result.companyName,
        target_object: result,
        operation_status: 'success'
      }, request);

      renderJSON(request, reply, error, statusResponse);
    });
  };

  // get
  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get account with Id ' + account_id, error));
    }
    if (result) {
      result = publicRecordFields.handle(result, 'account');
      if (result.billing_id === null || result.billing_id === undefined || result.billing_id === '') {
        Customer.create(result, function resultCreatingCustomer(error, data) {
          if (error) {
            if (!!error.error && error.error.name === 'ValidationError') {
              return reply(boom.badRequest('The customer account is not configured with all required contact/billing details', error));
            }
            return reply(boom.badImplementation('Failed to create a billing profile', error));
          }
          // Set billing_id for account
          result.billing_id = data.customer.id;
          updateAccountInformation(result, request, reply);
        });
      } else {
        return renderJSON(request, reply, error, result);
      }

    } else {
      return reply(boom.badRequest('Account ID not found', account_id));
    }
  });
};

/**
 * @name getAccount
 * @description
 *
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.getAccount = function(request, reply) {

  var account_id = request.params.account_id;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Accounts::getAccount: Failed to get an account' +
        ' Account ID: ' + account_id, error, error));
    }

    if (result) {
      // NOTE: get information about payment method
      result.valid_payment_method_configured = false;
      if (result.subscription_id) {
        Customer.getSubscriptionById(result.subscription_id, function resultGetSubscriptionInfo(err, info) {
          if (err) {
            return reply(boom.badRequest('Get Subscription Payment Method error '));
          } else {
            // NOTE: add information about payment method
            if (!!info.subscription.credit_card) {
              result.valid_payment_method_configured = true;
            }
            result = publicRecordFields.handle(result, 'account');
            renderJSON(request, reply, error, result);
          }
        });
      } else {
        result = publicRecordFields.handle(result, 'account');
        renderJSON(request, reply, error, result);
      }
    } else {
      return reply(boom.badRequest('Account ID not found'));
    }
  });
};

/**
 * @name  getAccountSubscriptionPreview
 * @description
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.getAccountSubscriptionPreview = function(request, reply) {

  var account_id = request.params.account_id;
  var billing_plan_handle = request.params.billing_plan_handle;

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Accounts::getAccountSubscriptionPreview: Failed to get an account' +
        ' Account ID: ' + account_id, error));
    }
    if (result) {
      result = publicRecordFields.handle(result, 'account');

      if (!result.billing_id || !result.subscription_id) {
        return reply(boom.badRequest('Account has no subscription_id'));
      }
      // NOTE: make call data from Chargify
      async.series([
        // NOTE: get Preview Migrations
        function getSubscriptionPreviewMigrations(cb) {
          Customer.subscriptionPreviewMigrations(result.subscription_id, billing_plan_handle, function resultGetPreviewSubscription(err, info) {
            if (err) {
              cb(err);
            } else {
              cb(err, info);
            }
          });
        },
        // NOTE: make check exists credit_card
        function getCreditCardInfo(cb) {
          Customer.getSubscription(result.subscription_id, function(err, info) {
            if (err) {
              cb(err);
            } else {
              if (!!info.subscription.credit_card) {
                cb(err, info.subscription.credit_card);
              } else {
                cb(null, null);
              }
            }
          });
        }
      ], function(error, results) {
        if (error) {
          return reply(boom.badRequest('Subscription info error '));
        } else {
          // NOTE: return info for migration
          results[0].credit_card = (!!results[1] ? true : false);
          renderJSON(request, reply, error, results[0]);
        }
      });
    } else {
      return reply(boom.badRequest('Account ID not found'));
    }
  });
};

/**
 * @name  getAccountSubscriptionSummary
 * @description
 *
 *
 * @param  {[type]} request
 * @param  {[type]} reply
 * @return
 */
exports.getAccountSubscriptionSummary = function(request, reply) {

  var account_id = request.params.account_id;
  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (result) {
      result = publicRecordFields.handle(result, 'account');

      if (!result.billing_id || !result.subscription_id) {
        return reply(boom.badRequest('Account has no subscription_id'));
      }

      Customer.getSubscriptionById(result.subscription_id, function resultGetSubscriptionInfo(err, info) {
        if (err) {
          return reply(boom.badRequest('Subscription info error '));
        } else {
          // NOTE: delete information not for send
          info.subscription.product_name = info.subscription.product.name;
          info.subscription.billing_portal_link = result.billing_portal_link;
          delete info.subscription.product;
          if (!!info.subscription.credit_card) {
            delete info.subscription.credit_card.current_vault;
            delete info.subscription.credit_card.customer_id;
          } else {
            info.subscription.credit_card = false;
          }
          delete info.subscription.customer;
          renderJSON(request, reply, error, info);
        }
      });

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
        ' Account ID: ' + account_id, error));
    }
    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('No subscription is registered for the account'));
    }
    Customer.getStatements(account.subscription_id, function(error, statements) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getAccountStatements: Failed to receive statements for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id, error));
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
        ' Account ID: ' + account_id, error));
    }
    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('No subscription is registered for the account'));
    }
    Customer.getTransactions(account.subscription_id, function(error, transactions) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getAccountStatements: Failed to receive transactions for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id, error));
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
        ' Account ID: ' + account_id, error));
    }

    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (!account.subscription_id) {
      return reply(boom.badRequest('No subscription is registered for the account'));
    }

    Customer.getStatements(account.subscription_id, function(error, statements) {
      if (error) {
        return reply(boom.badImplementation('Accounts::getAccountStatement: Failed to receive statement for subscription' +
          ' Subscription ID: ' + account.subscription_id +
          ' Account ID: ' + account_id +
          ' Statement ID: ' + request.params.statement_id, error));
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
        ' Account ID: ' + account_id, error));
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
          ' Statement ID: ' + request.params.statement_id, error));
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
            ' Statement ID: ' + request.params.statement_id, error));
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
        return reply(boom.badImplementation('Failed to update the account', error));
      }

      result = publicRecordFields.handle(result, 'account');

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the account'
      };

      AuditLogger.store({
        activity_type: 'modify',
        activity_target: 'account',
        target_id: request.params.account_id,
        target_name: result.companyName,
        target_object: result,
        operation_status: 'success'
      }, request);

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
      return reply(boom.badImplementation('Failed to read details for account ID ' + account_id, error));
    }

    if (!result || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    accounts.get({
      _id: updatedAccount.account_id
    }, function(error, account) {
      if (error) {
        return reply(boom.badImplementation('Accounts::updateAccount: failed to get an account' +
          ' Account ID: ' + updatedAccount.account_id, error));
      }

      // NOTE: check update billing_plan?
      if (updatedAccount.billing_plan && (account.billing_plan !== updatedAccount.billing_plan)) {
        if ((!account.billing_id || account.billing_id === '') && !account.subscription_id) {
          return reply(boom.badRequest('The account in not provisioned in the billing system'));
        } else {
          BillingPlan.get({
            _id: updatedAccount.billing_plan
          }, function(error, plan) {
            if (error) {
              return reply(boom.badRequest('Billing plan not found'));
            }
            if (!account.subscription_id) {
              Customer.createSubscription(updatedAccount.account_id, plan.chargify_handle, function(error, data) {
                if (error) {
                  return reply(boom.badImplementation('Accounts::updateAccount: failed to create subscription by Chargify product' +
                    ' Account ID: ' + updatedAccount.account_id +
                    ' Subscription ID: ' + account.subscription_id +
                    ' Product handle: ' + plan.chargify_handle, error));
                }
                updateAccount(request, reply);
              });
            } else {
              Customer.changeProduct(account.subscription_id, plan.chargify_handle, function(error) {
                if (error) {
                  return reply(boom.badImplementation('Accounts::updateAccount: failed to change Chargify product' +
                    ' Account ID: ' + updatedAccount.account_id +
                    ' Subscription ID: ' + account.subscription_id +
                    ' Product handle: ' + plan.chargify_handle, error));
                }
                updateAccount(request, reply);
              });
            }
          });

        }
      } else {
        // NOTE: update Account information - not billing_plan
        updateAccount(request, reply);
      }
    });
  });
};
/**
 * @name deleteAccount
 * @description
 *   Delete Account
 * @param  {[type]} request
 * @param  {[type]} reply
 * @return
 */
exports.deleteAccount = function(request, reply) {

  var account_id = request.params.account_id;
  var account;
  var _payload = request.payload;
  var cancellationMessage_ = _payload.cancellation_message || 'not provided';

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  var loggerInfo_ = {
    activity_type: 'delete',
    activity_target: 'account',
    request: request // TODO: set all properties from request for AuditLogger
  };

  var removeOptions_ = {
    autoRemove: false, // NOTE: don`t delete
    loggerInfo: loggerInfo_,
    deletedBy: utils.generateCreatedByField(request),
    remoteIP: utils.getAPIUserRealIP(request),
    cancellationMessage: cancellationMessage_
  };

  switch (request.auth.credentials.user_type) {
    case 'user':
    case 'apikey':
      removedAccountResult(account_id, removeOptions_);
      break;
    default:
      logger.error('Account::deleteAccount: Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
      return reply(boom.badImplementation('Failed to delete Account with account ID ' + account_id, JSON.stringify(request.auth.credentials)));
  }

  /**
   * @name  removedAccountResult
   * @description
   *
   *  Remove Account
   *
   * @param  {String} accountId [description]
   * @param  {Object} options   [description]
   * @return
   */
  function removedAccountResult(accountId, options) {
    accountService.removeAccount(accountId, options,
      function(err, result) {
        if (err) {
          logger.error('Account::deleteAccount: erro r in remove process ' + JSON.stringify(err));
          if (err.message) {
            // NOTE: show error message from accountService.removeAccount
            return reply(boom.badRequest(err.message, err));
          }
          return reply(boom.badImplementation('Failed to delete Account with account ID ' + accountId, err));
        }
        logger.info('Account::deleteAccount: Successfully deleted the account with id ' + accountId);
        var statusResponse;
        statusResponse = {
          statusCode: 200,
          message: 'Successfully deleted the account'
        };
        renderJSON(request, reply, null, statusResponse);
      });
  }

};
