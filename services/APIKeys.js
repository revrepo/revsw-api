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

var _ = require('lodash');
var utils = require('../lib/utilities.js');
var async = require('async');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');
var mongoConnection = require('../lib/mongoConnections');

var apiKey = require('../models/APIKey');
var apiKeys = new apiKey(mongoose, mongoConnection.getConnectionPortal());

/**
 * @name  deleteAPIKeysWithAccountId
 * @description
 *
 *   Delete API Keys with Account Id
 *
 * @param  {[type]}   accountId [description]
 * @param  {Function} cb        [description]
 * @return {[type]}             [description]
 */
exports.deleteAPIKeysWithAccountId = function(accountId, cb) {
  logger.info('deleteAPIKeysWithAccountId: Account Id ' + accountId);

  apiKeys.query({
    account_id: accountId
  }, function(err, data) {
    if (!err) {
      if (data.length >= 0) {
        async.eachSeries(data, function(item, cb_item) {
          apiKeys.remove({
            _id: item._id
          }, function(err) {
            if (err) {
              logger.error('deleteAPIKeysWithAccountId:error: API Key id ' + item._id + '(' + JSON.stringify(err) + ')');
            } else {
              logger.info('deleteAPIKeysWithAccountId:success API Key ' + item._id);
            }
            cb_item(!!err);
          });
        }, function(err) {
          cb(err);
        });
      } else {
        cb(null);
      }
    } else {
      logger.error('deleteAPIKeysWithAccountId:error' + JSON.stringify(err));
      cb(err);
    }
  });

};


/**
 * @name  deleteAccountIdFromAPIKeysAnotheAccounts
 * @description
 *
 *   Delete AccountId from managed_account_ids in API Keys
 *
 * @param  {String}   accountId [description]
 * @param  {Function} cb        [description]
 * @return {[type]}             [description]
 */
exports.deleteAccountIdFromAPIKeysAnotheAccounts = function(accountId, cb) {
  logger.info('deleteAccountIdFromAPIKeysAnotheAccounts: Account Id ' + accountId);

  apiKeys.query({
    'managed_account_ids': {
      $exists: true,
      $ne: [],
      $in: [accountId]
    },
    account_id: {
      $ne: accountId
    }
  }, function(err, data) {
    if (!err) {
      if (data.length >= 0) {
        apiKeys.cleanAccountIdInManagedAccountIds(accountId, function(err) {
          if (err) {
            logger.error('deleteAccountIdFromAPIKeysAnotheAccounts:error: delete ' + accountId +
              ' API Key id ' + '(' + JSON.stringify(err) + ')');
          } else {
            logger.info('deleteAccountIdFromAPIKeysAnotheAccounts:success delete ' + accountId + ' from API Keys');
          }
          cb(!!err);
        });
      } else {
        cb(null);
      }
    } else {
      logger.error('deleteAccountIdFromAPIKeysAnotheAccounts:error' + JSON.stringify(err));
      cb(err);
    }
  });

};
