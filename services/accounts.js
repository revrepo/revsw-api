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

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var User = require('../models/User');
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var usersService = require('../services/users.js');
var groupsService = require('../services/groups.js');
var emailService = require('../services/email.js');
var apiKeysService = require('../services/APIKeys.js');
var logShippingJobsService = require('../services/logShippingJobs.js');
var sslCertificatesService = require('../services/sslCertificates.js');

var cdsRequest = require('request');
var authHeader = { Authorization: 'Bearer ' + config.get('cds_api_token') };

var Nsone = require('../lib/nsone.js');
var Promise = require('bluebird');
var dnsZones = Promise.promisifyAll(new DNSZone(mongoose, mongoConnection.getConnectionPortal()));
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

 * @param  {String}   accountId [description]
 * @param  {Object}   options   [description]
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
          } else {

            if (existingApps.length > 0) {
              if (autoRemove_) {
                var options = '?deleted_by=' + deletedBy_;
                async.map(existingApps, function(appId, mapCallback) {
                    logger.info('Calling CDS to delete app ID ' + appId + ' and option deleted_by ' + deletedBy_);
                    // call CDS API
                    cdsRequest({
                        method: 'DELETE',
                        url: config.get('cds_url') + '/v1/apps/' + appId + options,
                        headers: authHeader
                      },
                      function(err, res, body) {
                        var _isDeleted = false;
                        if (err) {
                          logger.error('CDS failed to delete the mobile app with App ID ' + appId);
                        } else {
                          _isDeleted = (!!res.statusCode && res.statusCode === 200);
                        }
                        var response_json = JSON.parse(body);
                        mapCallback(null, {
                          app_id: appId,
                          isDeleted: _isDeleted
                        });
                      });
                  },
                  function(err, delResult) {
                    async.each(delResult, function(logDel, cb) {
                      if (logDel.isDeleted) {
                        logger.info('Account::removeAccount: Deleted App with id ' + logDel.app_id);
                      } else {
                        logger.error('Account::removeAccount: Failed to delete App with id ' + logDel.app_id + ' ');
                      }
                    }, function(err) {
                      logger.info('Account::removeAccount: Deleted all Apps finished');
                    });
                    cb(null); // All request is finished
                  });
              } else {
                // badRequest
                err_ = new Error('There are active apps for the account - please remove the apps before removing the account');
                cb(err_);
              }
            } else {
              cb(null);
            }
          }
        });
      },
      // verify that there are no active domains for an account
      function checkActiveDomainConfigs(cb) {
        domainConfigs.query({
          'proxy_config.account_id': accountId,
          deleted: {
            $ne: true
          }
        }, function(error, domainsList) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to verify that there are no active domains for account ID ' + accountId);
            cb(err_);
          } else {
            if (!error && domainsList.length > 0) {
              if (autoRemove_) {
                // NOTE: Call remove all domainConfigs
                var options = '?deleted_by=' + deletedBy_;
                async.map(domainsList, function(domainConfig, mapCallback) {

                    logger.info('Calling CDS to delete domain ID: ' + domainConfig._id + ' and option deleted_by ' + deletedBy_);
                    // Call CDS API
                    cdsRequest({
                        url: config.get('cds_url') + '/v1/domain_configs/' + domainConfig._id + options,
                        method: 'DELETE',
                        headers: authHeader,
                      },
                      function(err, res, body) {
                        var _isDeleted = false;
                        if (err) {
                          logger.error('CDS failed to delete the delete domain ID ' + domainConfig._id);
                        } else {
                          _isDeleted = (!!res.statusCode && res.statusCode === 200);
                        }
                        var response_json = JSON.parse(body);
                        mapCallback(null, {
                          domainConfig: domainConfig,
                          isDeleted: _isDeleted
                        });
                      });
                  },
                  function(err, delResult) {
                    async.each(delResult, function(logDel, cb) {
                      if (logDel.isDeleted) {
                        logger.info('Account::removeAccount: Deleted domain ID ' + logDel.domainConfig._id);
                      } else {
                        logger.error('Account::removeAccount: Failed to delete domain ID ' + logDel.domainConfig._id + ' ');
                      }
                    }, function(err) {
                      logger.info('Account::removeAccount: Delete All domain finished');
                    });
                    cb(null); // All request is finished
                  });
              } else {
                //badRequest
                err_ = new Error('There are active domains registered for the account - please remove the domains before removing the account');
                cb(err_);
              }
            } else {
              cb(null);
            }
          }
        });
      },
      // verify that there are no active dns zones for an account
      function checkActiveDNSZones(cb) {
        dnsZones.getByAccountId(accountId, function(error, dnsZones_) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to verify that there are no active DNS Zones for account ID ' + accountId);
            cb(err_);
          } else {
            if (dnsZones_.length > 0) {
              if (autoRemove_) {
                // NOTE: Remove all dnsZones one by one (async.mapSeries)
                async.mapSeries(dnsZones_,
                  function removeEachDNSZone(zone_, callbackData_) {
                    // Run delete one DNS Zone from list
                    var nsoneZoneInfo = null;
                    Promise.try(function() {
                        Nsone.getDnsZone(zone_.zone)
                          .then(function(nsoneZone_) {
                            nsoneZoneInfo = nsoneZone_;
                            // Found zone, delete then
                            return Nsone.deleteDnsZone(nsoneZone_)
                              .then(function() {
                                // Zone removed from NS1
                                return Promise.resolve(true);
                              })
                              .catch(function(error) {
                                logger.error('AccountRemove:NSONE DNS Zone not deleted (' + JSON.stringify(nsoneZoneInfo) + ')');
                                throw error;
                              });
                          })
                          .catch(function(error) {
                            throw error;
                          });
                      })
                      .then(function() {
                        // Delete zone from DNSZone collection
                        return dnsZones.removeAsync(zone_.id);
                      })
                      .then(function(removedDnsZone_) {
                        // TODO: prepare information for audit logger and store it
                        // zone_.ttl = nsoneZoneInfo.ttl;
                        // zone_.refresh = nsoneZoneInfo.refresh;
                        // zone_.retry = nsoneZoneInfo.retry;
                        // zone_.expiry = nsoneZoneInfo.expiry;
                        // zone_.nx_ttl = nsoneZoneInfo.nx_ttl;
                        logger.info('Account::removeAccount: AuditLogger removedDnsZone ' + JSON.stringify(zone_));
                        // TODO: Требуются обязательные параметры для логирования удаления из Azure
                        //  AuditLogger.store({
                        //    activity_type: 'delete',
                        //    activity_target: 'dnszone',
                        //    target_id: zone_.id,
                        //    target_name: zone_.zone,
                        //    target_object: zone_, // NOTE: save info about already deleted object
                        //    operation_status: 'success'
                        // }, request);
                        return Promise.resolve(removedDnsZone_);
                      })
                      .then(function successRemoveOneDNSZone(data) {
                        logger.info('Account::removeAccount:removedDnsZone:AuditLogger data ' + JSON.stringify(zone_));
                        callbackData_(null, {
                          isDeleted: true,
                          zone: zone_
                        });
                      })
                      .catch(function errorRemoveOneDNSZone(err) {
                        logger.error('Account::removeAccount:removedDnsZone: Error delete DNS Zone ' + JSON.stringify(zone_));
                        callbackData_(null, {
                          isDeleted: false,
                          zone: zone_
                        });
                      });
                  },
                  function(err, resultRemoveAll) {
                    async.eachSeries(resultRemoveAll, function(logDel, cb_) {
                      if (logDel.isDeleted) {
                        logger.info('Account::removeAccount: Deleted DNS Zone  ' + logDel.zone.id);
                      } else {
                        logger.error('Account::removeAccount: Failed to delete domain ID ' + logDel.zone.id + ' ');
                      }
                      cb_(null);
                    }, function(err) {
                      logger.info('Account::removeAccount: Delete all DNS Zones finished ');
                    });
                    cb(null);
                  });
              } else {
                //badRequest
                err_ = new Error('There are active DNS Zones registered for the account - please remove the DNS Zones before removing the account');
                cb(err_);
              }
            } else {
              cb(err_);
            }
          }
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
      // Automatically delete account id from all API keys belonging to another accounts (from managed_account_ids)
      function removeAccountsApiKeys(cb) {
        apiKeysService.deleteAccountIdFromAPIKeysAnotheAccounts(accountId, function(error) {
          var err_ = null;
          if(error) {
            logger.error('Error clean managed_account_ids in All API keys for account ID ' + accountId);
            err_ = new Error('Failed to delete account ID from manage list in All API keys (for account ID ' + accountId + ')');
          }
          logger.info('Clean managed_account_ids in All API keys while removing account ID ' + accountId);
          cb(err_);
        });
      },
      function removeAccountFromPermissions(cb) {
        usersService.deleteAccountFromPermissions(accountId.toString()).then(function (res) {
          if (res) {
            apiKeysService.deleteAccountFromPermissions(accountId.toString()).then(function (res) {
              if (res) {
                groupsService.deleteAccountFromPermissions(accountId.toString()).then(function (res) {
                  if (res) {
                    cb(null);
                  }
                }).catch(function (err) {
                  cb(err);
                });
              }
            }).catch(function (err) {
              cb(err);
            });
          }
        }).catch(function (err) {
          cb(err);
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
        var options = {
          account_id: accountId
        };
        users.list(options, function(error, usersToUpdate) {
          var err_ = null;
          if (error) {
            // badImplementation
            err_ = new Error('Failed to retrieve from the DB a list of all users');
          }
          if (usersToUpdate.length > 0) {
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
            logger.info('User with ID ' + user_id + 'and role "' + _role + '"  while removing account ID ' + accountId);

              // NOTE: delete user and all his resources
              logger.info('Accounts:dropAccountUsers:Removing user with ID ' + user_id + ' while removing account ID ' + accountId);
              usersService.removeUser(user_id, function(error, result) {
                var err_ = null;
                if (error) {
                  logger.warn('Account:dropAccountUsers:Failed to delete user with ID ' + user.user_id + ' while removing account ID ' + accountId);
                  err_ = new Error('Failed to delete user with ID ' + user.user_id + ' while removing account ID ' + accountId);
                } else {
                  logger.info('Removed user with ID ' + user_id + ' and role "' + _role + '" while removing account ID ' + accountId);
                }
                callback_(err_, user);
              });
          },
          function(error) {
            cb(error);
          });
      },
      // NOTE: delete managed account for all users
      function cleanManagedAccountIdForResselers(cb) {
        var accountId_ = accountId;
        users.cleanOneManagedAccountIdForAllResselers(accountId_,function(err,data){
          if(err){
            logger.error('Account:cleanManagedAccountIdForResselers:Failed to remove for all resselers the account ID ' + accountId);
            return cb(err);
          }
          logger.info('Account:cleanManagedAccountIdForResselers:Removed for all resselers the account ID ' + accountId);
          cb(null);
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
      callback(err, removedAccount_);
    });
};
