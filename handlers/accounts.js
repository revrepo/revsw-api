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

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var LogShippingJob = require('../models/LogShippingJob');
var logShippingJobs = new LogShippingJob(mongoose, mongoConnection.getConnectionPortal());

var Dashboard = require('../models/Dashboard');
var dashboard = new Dashboard(mongoose, mongoConnection.getConnectionPortal());

var App = require('../models/App');
var apps = new App(mongoose, mongoConnection.getConnectionPortal());

var ApiKey = require('../models/APIKey');
var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());

var apiKeysService = require('../services/APIKeys.js');
var dashboardService = require('../services/dashboards.js');
var logShippingJobsService = require('../services/logShippingJobs.js');

var emailService = require('../services/email.js');

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
        user_name: newAccount.createdBy,
        activity_type: 'add',
        activity_target: 'account',
        target_id: result.id,
        target_name: result.companyName,
        target_object: result,
        operation_status: 'success'
      }, request);

      // Update the user who created the new company account with details of the new account ID
      var updatedUser = {
        user_id: request.auth.credentials.user_id,
        companyId: utils.getAccountID(request)
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
/**
 * @name  createBillingProfile
 * @description
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
    if (result) {
      // Validation data for create Billing Profile
      result = publicRecordFields.handle(result, 'account');
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
      return reply(boom.badRequest('No subscription registered for the account'));
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
      return reply(boom.badRequest('No subscription registered for account.'));
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
      return reply(boom.badRequest('No subscription registered for account.'));
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
  var _cancellation_message = _payload.cancellation_message || 'not provided';

  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }
  var _deleted_by = utils.generateCreatedByField(request);
  var _cancellation_message_for_chargify = 'Cancel by customer on ' + moment().toISOString() +
    '(UTC),  user (' + _deleted_by + '), cancellation node (' + _cancellation_message + ')';

  // NOTE:  detect role for different roles use differet work-flow
  // 1. Work-flow for users with role Admin and call with apikey - in safe mode
  // 2. Work-flow for users with roles RevAdmin or Resseler - in hard mode (auto delete all related apps, domains and APIkeys)

  switch (request.auth.credentials.user_type) {
    case 'user':
      var role = request.auth.credentials.role;
      if (role === 'revadmin' || role === 'reseller') {
        // TODO: need delete Account in hard mode - method not finished -> deleteAccountInHardMode();
        deleteAccountInSafeMode();
      }
      if (role === 'admin') {
        deleteAccountInSafeMode();
      }
      break;
    case 'apikey':
      deleteAccountInSafeMode();
      break;
    default:
      logger.error('Account::deleteAccount: Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
      return reply(boom.badImplementation('Failed to delete Account with account ID ' + account_id, JSON.stringify(request.auth.credentials)));
      // break;
  }

  /**
   * @name  deleteAccountInHardMode
   * @description
   *
   * Delete Account in Hard Mode
   * !!! NOT IMPLEMENTED
   *
   * @return
   */
  function deleteAccountInHardMode() {

    async.waterfall([
      // TODO:  Automatically delete all active Apps
      // function deleteActiveApps(cb) {
      // cb()
      // },
      //
      // TODO: Automatically delete all API keys belonging to the account ID
      // function removeAccountsApiKeys(cb) {
      // cb()
      // },
      function loggerDeleteAccount(cb) {
        cb(true);
      }
    ], function(err) {
      if (err) {
        logger.error('Account::deleteAccountInHardMode:  ' + JSON.stringify(request.auth.credentials));
        return reply(boom.badImplementation('Failed to delete account ID ' + account_id, err));
      }
    });
  }
  /**
   * @name  deleteAccountInSafeMode
   * @description
   *
   * Delete Account in Safly mode
   *
   * @return {[type]} [description]
   */
  function deleteAccountInSafeMode() {
    async.waterfall([
      // Verify that there are no active apps for an account
      function checkActiveApps(cb) {
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
      function getAccountData(cb) {
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
      function cancellAccountSubscription(account, cb) {
        if (account.subscription_id && (account.subscription_state !== 'canceled')) {
          Customer.cancelSubscription(account.subscription_id, _cancellation_message_for_chargify, function(err, data) {
            if (err) {
              // NOTE: can be to get error if try canceled subscription from anothe Cahrgify Site trialing
              logger.error('Accoutn::deleteAccount:error on cancellAccountSubscription ' + JSON.stringify(err));
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
      // Automatically delete all API keys belonging to the account ID
      function removeAccountsApiKeys(cb) {
        apiKeysService.deleteAPIKeysWithAccountId(account_id, function(error) {
          if (error) {
            logger.error('Error remove All API keys while removing account ID ' + account_id);
            return reply(boom.badImplementation('Failed to delete API keys for account ID ' + account_id));
          }
          cb();
        });
      },
      // NOTE: Auto Delete Log Shipping Jobs
      function autoRemoveLogShippingJobs(cb) {
        logShippingJobsService.deleteJobsWithAccountId(account_id, function(err, data) {
          if (err) {
            logger.error('Error remove All Log Shipping Jobs while removing account ID ' + account_id);
            return reply(boom.badImplementation('Failed to delete Log Shipping Jobs for account ID ' + account_id));
          }
          logger.info('Removed All Log Shipping Jobs while removing account ID ' + account_id);
          cb();
        });
      },
      // Drop the deleted account_id from companyId of all users which are managing the account
      function getAccountUsersForDelete(cb) {
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
      function dropAccountUsers(usersToUpdate, cb) {
        async.eachSeries(usersToUpdate, function(user, callback) {
            var user_id = user.user_id;
            var _role = user.role;
            logger.info('User with ID ' + user_id + 'and role "' + _role + '"  while removing account ID ' + account_id + '. Count Companies = ' +
              user.companyId.length + ' ' + JSON.stringify(user.companyId));
            if (user.companyId.length === 1) {
              // NOTE: delete user's dashboards
              logger.info('Accounts:dropAccountUsers:Removing Dashboards for user with ID ' + user_id + ' while removing account ID ' + account_id);
              dashboardService.deleteDashboardsWithUserId(user_id, function(error) {
                if (error) {
                  return reply(boom.badImplementation('Error removing the dashboards'));
                } else {
                  // NOTE: delete user if all his dashboards deleted
                  users.remove({
                    _id: user.user_id
                  }, function(error, result) {
                    if (error) {
                      logger.warn('Accounts:dropAccountUsers:Failed to delete user ID ' + user.user_id + ' while removing account ID ' + account_id);
                      return reply(boom.badImplementation('Failed to delete user ID ' + user.user_id + ' while removing account ID ' + account_id, error));
                    }
                    logger.info('Removed user ID ' + user_id + 'and role "' + _role + '" while removing account ID ' + account_id);
                    callback(error, user);
                  });
                }
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
                  return reply(boom.badImplementation('Failed to update user ID ' + user.user_id + ' while removing account ID ' + account_id, error));
                }
                callback(error, user);
              });
            }
          },
          function(error) {
            cb(error);
          });
      },
      // Mark account as deleted
      function markAccountAsDeleted(cb) {
        var deleteAccountQuery = {
          account_id: account_id,
          deleted: true,
          subscription_state: 'canceled',
          deleted_by: _deleted_by,
          deleted_at: new Date(),
          cancellation_message: _cancellation_message,
        };

        accounts.update(deleteAccountQuery, function(error) {
          if (error) {
            return reply(boom.badImplementation('Failed to set delete flag to account ID ' + account_id, error));
          }
          cb(error);
        });
      },
      // Send an email to Rev ops team notifying about the closed account
      function sendRevOpsEmailAboutCloseAccount(cb) {
        logger.info('deleteAccount:sendRevOpsEmailAboutNewSignup');
        emailService.sendRevOpsEmailAboutCloseAccount({
          remoteIP: utils.getAPIUserRealIP(request),
          account_id: account_id,
          companyName: account.companyName,
          deleted_by: _deleted_by,
          cancellation_message: _cancellation_message
        }, function(err, data) {
          if (err) {
            logger.error('deleteAccount:sendRevOpsEmailAboutCloseAccount:error: ' + JSON.stringify(err));
          } else {
            logger.info('deleteAccount:sendRevOpsEmailAboutCloseAccount:success');
          }
        });
        cb(null);
      },
      // Log results and finish request
      function loggerDeleteAccount(cb) {
        var statusResponse;
        statusResponse = {
          statusCode: 200,
          message: 'Successfully deleted the account'
        };

        account = publicRecordFields.handle(account, 'account');

        AuditLogger.store({
          activity_type: 'delete',
          activity_target: 'account',
          target_id: account.id,
          target_name: account.companyName,
          target_object: account,
          operation_status: 'success'
        }, request);

        renderJSON(request, reply, null, statusResponse);
      }
    ], function(err) {
      if (err) {
        return reply(boom.badImplementation('Failed to delete account ID ' + account_id));
      }
    });
  }
};
