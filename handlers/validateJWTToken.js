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

var User = require('../models/User');
var Account = require('../models/Account');

var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());


exports.validateJWTToken = function (request, decodedToken, callback) {
  var user_id = decodedToken.user_id,
    password = decodedToken.password;

  users.get({
    _id: user_id, password: password
  }, function(error, result) {

    if (!result) {
      return callback(error, false, result);
    }

    // Users without companyId data should not be able to log in
    if (result.role !== 'revadmin' && !result.companyId) {
      return callback(error, false, result);
    }

    result.user_type = 'user';

    result.scope = [];

    result.scope.push(result.role);
    if (!result.access_control_list.readOnly) {
      result.scope.push(result.role + '_rw');
    }

    var accountId = result.companyId && result.companyId.length && result.companyId[0];
    if(!accountId){
       result.vendor_profile = config.get('default_signup_vendor_profile');

      return callback(error, true, result);
    }

    accounts.get( { _id: accountId }, function (error, account) {
      if (error) {
          logger.error('Failed to retrieve DB details for account ID ' + accountId + ' (User ' + user_id + ')');
          return callback(error, false, result);
      }

      if (!account) {
          logger.error('DB inconsitency for Users: cannot find account ID ' + accountId + ' (User ' + user_id + ')');
          return callback(error, false, result);
      }

      result.vendor_profile = account.vendor_profile;

      return callback(error, true, result);
    });
  });
};
