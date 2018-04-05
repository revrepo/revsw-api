
/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
// User Service
'use strict';

var _ = require('lodash');
var async = require('async');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));
var crypto = require('crypto');
var mongoose = require('mongoose');
var utils = require('../lib/utilities.js');
var Promise = require('bluebird');

var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');
var Account = require('../models/Account');
var Group = require('../models/Group');

var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var groups = new Group(mongoose, mongoConnection.getConnectionPortal());

var dashboardService = require('./dashboards');
var statuspageService = require('./statuspage');
var vendorProfiles = config.get('vendor_profiles');
var emailService = require('./email');
var moment = require('moment');

exports.deleteAccountFromPermissions = function (account_id) {
  return new Promise(function (resolve, reject) {
    if (!account_id) {
      return reject('No account ID specified');
    }

    groups.model.find({}, function (err, userList) {
      if (err || !userList || userList.length === 0) {
        return reject('Problem fetching users');
      }

      userList.forEach(function (user) {
        var orgUser = user;
        user = user._doc;
        checkUserForAccount(user, account_id).then(function () {
          if (userList.indexOf(orgUser) === userList.length - 1) {
            return resolve(true);
          }
        })
        .catch(reject);
      });
      
    });
  });
};

function checkUserForAccount(user, account_id) {
  return new Promise(function (resolve, reject) {
    if (user.permissions) {
      if (user.permissions.accounts.list && user.permissions.accounts.list.indexOf(account_id) !== -1) {
        user.permissions.accounts.list.splice(user.permissions.accounts.list.indexOf(account_id), 1);
        var updateUser = {
          id: user.id || user._id,
          permissions: user.permissions
        };
        groups.update(updateUser, function (error, item) {
          if (error) {
            return reject(error);
          }

          return resolve(true);
        });
      } else {
        return resolve(true);
      }
    } else {
      return resolve(true);
    }
  });
}