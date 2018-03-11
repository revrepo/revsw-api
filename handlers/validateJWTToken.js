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
var Group = require('../models/Group');

var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var groups = new Group(mongoose, mongoConnection.getConnectionPortal());

var defaultSystemVendorProfile = config.get('default_system_vendor_profile');


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

    var accountId;

    result.scope.push(result.role);

    if(result.group_id || result.acl) {
      // if user is in a group or has the new `acl` field, use new permissions feature

      if (result.group_id) {
        /* if the user is in a group, we need to get that group and use it's permissions
           they override the user's `acl`. */
        groups.getById(result.group_id).then(function (group) {
          if (!group.permissions.read_only) {
            result.scope.push(result.role + '_rw');
            result.permissions = group.permissions; // set a permissions field containing all our permissions
          }
        }).catch(function (err) {
          return callback(err, false, result);
        });

        
      } else {
        // no group, only ACL.
        if (!result.acl.read_only) {
          result.scope.push(result.role + '_rw');
        }

         // result.permissions will have either user's group permissions (if exists) or user's ACL permissions.
         // so we dont have to check everytime where to pull the permissions from.
        result.permissions = result.acl;
      }

      accountId = result.companyId && result.companyId.length && result.companyId[0];
      if (!accountId) {
        result.vendor_profile = defaultSystemVendorProfile;

        return callback(error, true, result);
      }

      accounts.get({ _id: accountId }, function (error, account) {
        if (error) {
          logger.error('Failed to retrieve DB details for account ID ' + accountId + ' (User ' + user_id + ')');
          return callback(error, false, result);
        }

        if (!account) {
          logger.error('DB inconsitency for Users: cannot find account ID ' + accountId + ' (User ' + user_id + ')');
          return callback(error, false, result);
        }

        result.vendor_profile = account.vendor_profile || defaultSystemVendorProfile;

        return callback(error, true, result);
      });

    } else {
      // use old `access_control_list` method, no group or acl found..

      if (!result.access_control_list.readOnly) {
        result.scope.push(result.role + '_rw');
      }

      accountId = result.companyId && result.companyId.length && result.companyId[0];
      if(!accountId){
        result.vendor_profile = defaultSystemVendorProfile;

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

        result.vendor_profile = account.vendor_profile || defaultSystemVendorProfile;

        return callback(error, true, result);
      });
    }
  });
};
