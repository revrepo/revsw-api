/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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
// Accounts Service
'use strict';

var _ = require('lodash');
var moment = require('moment');
var async = require('async');
var AuditLogger = require('../lib/audit');

var utils = require('../lib/utilities.js');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var publicRecordFields = require('../lib/publicRecordFields');

var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));

var mongoose = require('mongoose');
var utils = require('../lib/utilities.js');

var mongoConnection = require('../lib/mongoConnections');

var Customer = require('../lib/chargify').Customer;

var Account = require('../models/Account');
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

var App = require('../models/App');
var apps = new App(mongoose, mongoConnection.getConnectionPortal());

var DNSZone = require('../models/DNSZone');
var dnsZones = new DNSZone(mongoose, mongoConnection.getConnectionPortal());

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var User = require('../models/User');
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var usersService = require('../services/users.js');
var emailService = require('../services/email.js');
var apiKeysService = require('../services/APIKeys.js');
var logShippingJobsService = require('../services/logShippingJobs.js');
var sslCertificatesService = require('../services/sslCertificates.js');




/**
 * @name createAccount
 * @description
 *
 *  Create account
 *
 * @param  {[type]}   newAccount [description]
 * @param  {[type]}   options    [description]
 * @param  {Function} cb         [description]
 * @return {[type]}              [description]
 */
exports.createAccount = function(newAccount, options, callback) {
  var createdAccount_ = null;
  async.waterfall([
    function checkinNewAccountParams(cb) {
      cb();
    },
    function addNewAccount(cb) {
      accounts.add(newAccount, function(err, result) {
        if (!err) {
          createdAccount_ = result;
        }
        cb(err);
      });
    },
    //
    function addLog(cb) {
      if (!!options && !!options.loggerData) {
        var result = publicRecordFields.handle(createdAccount_, 'account');

        AuditLogger.store({
          user_type: options.loggerData.user_type,
          user_name: newAccount.createdBy,
          activity_type: options.loggerData.activity_type || 'add',
          activity_target: 'account',
          target_id: result.id,
          target_name: result.companyName,
          target_object: result,
          operation_status: 'success'
        }, options.loggerData.request);
        cb();
      } else {
        cb();
      }
    }
  ], function(err) {

    callback(null, createdAccount_);
  });
};
/**
 * @name removeAccount
 * @description

 * @param  {[type]}   accountId [description]
 * @param  {[type]}   options   [description]
 * @param  {Function} callback  [description]
 * @return
 */
exports.removeAccount = function(accountId, options, callback) {
  var removedAccount_ = null;
  var autoRemove_ = options.autoRemove || false;
  var deletedBy_ = options.deletedBy;
  var remoteIP_ = options.remoteIP;
  var cancellationMessage_ = options.cancellationMessage || 'not provided';
  var usersListRemovedAccount_ = []; //
  async.waterfall([
      // verify that account exists
      function checkAccount(cb) {
        accounts.get({
          _id: accountId
        }, function(error, account2) {
          var err_ = null;
          if (error) {
            err_ = new Error('Failed to read account details for account ID ' + accountId);
          }
          if (!account2) {
            err_ = new Error('Account ID not found');
          }
          removedAccount_ = account2;
          cb(err_);
        });
      },
      // Apps
      function checkActiveApps(cb) {
        apps.accountList([accountId], function(error, existingApps) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to verify that there are no active apps for account ID ' + accountId);
          }
          if (existingApps.length > 0) {
            if (autoRemove_) {
              // NOTE: delete all existing Apps
              async.each(existingApps, function(appId, _callback_) {
                apps.remove({ _id: appId }, function resRemovedOneApp(err, app) {
                  _callback_(err);
                });
              }, function resRemovedAllApps(_err_) {
                console.log('resRemovedAllApps', _err_);
                if (_err_) {
                  cb(new Error('Can`t delete all Apps'));
                } else {
                  cb(null);
                }
              });
            } else {
              // badRequest
              err_ = new Error('There are active apps for the account - please remove the apps before removing the account');
              cb(err_);
            }
          } else {
            cb(null);
          }

        });
      },
      // verify that there are no active domains for an account
      function(cb) {
        domainConfigs.query({
          'proxy_config.account_id': accountId,
          deleted: {
            $ne: true
          }
        }, function(error, domains) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to verify that there are no active domains for account ID ' + accountId);
          }
          if (domains.length > 0) {
            if (autoRemove_) {
              // TODO: Remove all domainConfigs

            } else {
              //badRequest
              err_ = new Error('There are active domains registered for the account - please remove the domains before removing the account');
            }
          }
          cb(err_);
        });
      },
      // verify that there are no active dns zones for an account
      function(cb) {
        dnsZones.getByAccountId(accountId, function(error, dnsZones_) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to verify that there are no active DNS Zones for account ID ' + accountId);
          }
          if (dnsZones_.length > 0) {
            if (autoRemove_) {
              // TODO: Remove all dnsZones
            } else {
              //badRequest
              err_ = new Error('There are active DNS Zones registered for the account - please remove the DNS Zones before removing the account');
            }
          }
          cb(err_);
        });
      },
      // NOTE: Cancel subscription
      function cancellAccountSubscription(cb) {
        var account = removedAccount_;
        var cancellationMessageForChargify = 'Cancel by customer on ' + moment().toISOString() +
          '(UTC),  user (' + deletedBy_ + '), cancellation node (' + cancellationMessage_ + ')';

        if (account.subscription_id && (account.subscription_state !== 'canceled')) {
          Customer.cancelSubscription(account.subscription_id, cancellationMessageForChargify, function(err, data) {
            if (err) {
              // NOTE: can be to get error if try canceled subscription from anothe Cahrgify Site trialing
              logger.error('Account::removeAccount:error on cancellAccountSubscription ' + JSON.stringify(err));
              cb(err);
            } else {
              logger.info('Account::removeAccount:Subscription with ID ' + account.subscription_id + ' was canceled.' + JSON.stringify(data));
              cb(null);
            }
          });
        } else {
          cb(null);
        }
      },
      // Automatically delete All Private SSL Certificates
      function(cb) {
        sslCertificatesService.deletePrivateSSLCertificatesWithAccountId(accountId, { deleted_by: deletedBy_ }, function(error, data) {
          var err_ = null;
          if (error) {
            logger.error('Account::removeAccount:Error remove Private SSL Certificates while removing account ID ' + accountId);
            //badImplementation
            err_ = new Error('Failed to delete Private SSL Certificates for account ID ' + accountId);
          }
          logger.info('Removed All Private SSL Certificates while removing account ID ' + accountId);
          cb(err_);
        });
      },
      // Automatically delete all API keys belonging to the account ID
      function removeAccountsApiKeys(cb) {
        apiKeysService.deleteAPIKeysWithAccountId(accountId, function(error) {
          var err_ = null;
          if (error) {
            logger.error('Error remove All API keys while removing account ID ' + accountId);
            //badImplementation
            err_ = new Error('Failed to delete API keys for account ID ' + accountId);
          }
          logger.info('Removed All API keys while removing account ID ' + accountId);
          cb(err_);
        });
      },
      // NOTE: Auto Delete Log Shipping Jobs
      function autoRemoveLogShippingJobs(cb) {
        logShippingJobsService.deleteJobsWithAccountId(accountId, function(error, data) {
          var err_ = null;
          if (error) {
            logger.error('Error remove All Log Shipping Jobs while removing account ID ' + accountId);
            // badImplementation
            err_ = new Error('Failed to delete Log Shipping Jobs for account ID ' + accountId);
          }
          logger.info('Removed All Log Shipping Jobs while removing account ID ' + accountId);
          cb(err_);
        });
      },
      //======================
      // Remove users
      //======================
      // Drop the deleted account_id from companyId of all users which are managing the account
      function getAccountUsersForDelete(cb) {
        // TODO: change method users.listAll
        users.listAll(null, function(error, usersToUpdate) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to retrieve from the DB a list of all users');
          }
          if (usersToUpdate.length > 0) {
            for (var i = 0; i < usersToUpdate.length; i++) {
              if (usersToUpdate[i].companyId.indexOf(accountId) === -1) {
                usersToUpdate.splice(i, 1);
                i--;
              }
            }
            usersListRemovedAccount_ = usersToUpdate;
          }
          cb(err_);
        });
      },
      function dropAccountUsers(cb) {
        //
        async.eachSeries(usersListRemovedAccount_, function(user, callback_) {
            var user_id = user.user_id;
            var _role = user.role;
            logger.info('User with ID ' + user_id + 'and role "' + _role + '"  while removing account ID ' + accountId + '. Count Companies = ' +
              user.companyId.length + ' ' + JSON.stringify(user.companyId));

            if (user.companyId.length === 1) {
              // NOTE: delete user's dashboards
              logger.info('Accounts:dropAccountUsers:Removing Dashboards for user with ID ' + user_id + ' while removing account ID ' + accountId);
              usersService.removeUser(user_id, function(error, result) {
                var err_ = null;
                if (error) {
                  logger.warn('Account:dropAccountUsers:Failed to delete user ID ' + user.user_id + ' while removing account ID ' + accountId);
                  // badImplementation
                  err_ = new Error('Failed to delete user ID ' + user.user_id + ' while removing account ID ' + accountId);
                } else {
                  logger.info('Removed user ID ' + user_id + 'and role "' + _role + '" while removing account ID ' + accountId);
                }
                callback_(err_, user);
              });

            } else { /// else just update the user account and delete the account_id from companyId array
              logger.warn('Updating user ID ' + user_id + ' while removing account ID ' + accountId);
              var indexToDelete = user.companyId.indexOf(accountId);
              logger.debug('indexToDelete = ' + indexToDelete + ', account_id = ' + accountId + ', user.companyId = ' + user.companyId);
              user.companyId.splice(indexToDelete, 1);
              var updatedUser = {
                user_id: user_id,
                companyId: user.companyId
              };

              users.update(updatedUser, function(error, result) {
                var err_ = null;
                if (error) {
                  //badImplementation
                  err_ = new Error('Failed to update user ID ' + user.user_id + ' while removing account ID ' + accountId);
                }
                callback(err_, user);
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
          account_id: accountId,
          deleted: true,
          subscription_state: 'canceled',
          deleted_by: deletedBy_,
          deleted_at: new Date(),
          cancellation_message: cancellationMessage_,
        };

        accounts.update(deleteAccountQuery, function(error) {
          var err_ = null;
          if (error) {
            //badImplementation
            err_ = new Error('Failed to set delete flag to account ID ' + accountId);
          }
          cb(err_);
        });
      },
      // Send an email to Rev ops team notifying about the closed account
      function sendRevOpsEmailAboutCloseAccount(cb) {
        logger.info('removeAccount:sendRevOpsEmailAboutNewSignup');
        emailService.sendRevOpsEmailAboutCloseAccount({
          remoteIP: remoteIP_,
          account_id: accountId,
          companyName: removedAccount_.companyName,
          deleted_by: deletedBy_,
          cancellation_message: cancellationMessage_
        }, function(err, data) {
          if (err) {
            logger.error('removeAccount:sendRevOpsEmailAboutCloseAccount:error: ' + JSON.stringify(err));
          } else {
            logger.info('removeAccount:sendRevOpsEmailAboutCloseAccount:success');
          }
        });
        cb(null);
      },
      function addLog(cb) {
        if (!!options && !!options.loggerInfo) {
          AuditLogger.store({
            activity_type: 'delete',
            activity_target: 'account',
            operation_status: 'success',
            target_id: removedAccount_.id,
            target_name: removedAccount_.companyName,
            target_object: removedAccount_,
            user_id: options.loggerInfo.user_id,
            user_type: options.loggerInfo.user_type,
            user_name: options.loggerInfo.user_name,
            ip_address: options.loggerInfo.ip_address
          }, options.loggerInfo.request);
        }
        cb();
      }
    ],
    // Final callback
    function(err) {
      if (err) {
        callback(err);
      }
      callback(err, removedAccount_);
    });
};
