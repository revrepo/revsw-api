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

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');
var mongoConnection = require('../lib/mongoConnections');

var ApiKey = require('../models/APIKey');
var Account = require('../models/Account');

var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

var accountId;

exports.validateAPIKey = function (request, key, callback) {
  apiKeys.get({
    key: key
  }, function(error, result) {

    if (error) {
      logger.error('Failed to retrieve DB details for API key ' + key);
      return callback(error, false, result);
    }

    if (!result) {
      logger.warn('Cannot find API ' + key + ' in the database');
      return callback(error, false, result);
    }

    if (!result.account_id) {
      logger.error('API key ' + key + ' does not have a proper account_id attribute');
      return callback(error, false, result);
    }

    if (!result.active) {
      logger.warn('Trying to use disabled API key ' + key);
      return callback(error, false, result);
    }

    accountId = result.account_id;

    accounts.get( { _id: accountId }, function (error, account) {
      if (error) {
        logger.error('Failed to retrieve DB details for account ID ' + accountId + ' (API key ' + key + ')');
        return callback(error, false, result);
      }

      if (!account) {
        logger.error('DB inconsitency for API keys: cannot find account ID ' + accountId + ' (API key ' + key + ')');
        return callback(error, false, result);
      }
      
      result.user_type = 'apikey';
      result.scope = [ 'apikey' ];
      if (result.read_only_status === false) {
        result.scope.push('apikey_rw');
      }

      return callback(error, true, result);
    });
  });
};
