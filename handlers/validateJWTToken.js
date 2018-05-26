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
var boom = require('boom');

var mongoose = require('mongoose');

var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');
var Account = require('../models/Account');
var Group = require('../models/Group');

var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var groups = new Group(mongoose, mongoConnection.getConnectionPortal());

var defaultSystemVendorProfile = config.get('default_system_vendor_profile');
var permissionsScope = require('./../lib/requestPermissionScope');
var requestThrottling = require('./../lib/requestThrottling');


exports.validateJWTToken = function (request, decodedToken, callback) {
  var user_id = decodedToken.user_id,
    password = decodedToken.password;

  users.get({
    _id: user_id, password: password
  }, function (error, result) {

    if (!result) {
      return callback(error, false, result);
    }

    if (!result.account_id && result.role !== 'revadmin') {
      return callback('Account ID is not set', false, result);
    }

    requestThrottling.checkAccount(request, result.account_id).then(function (response) {
      permissionsScope.setPermissionsScope(result).then(function (res) {
        return callback(null, true, res);
      }).catch(function (err) {
        return callback(err, false, result);
      });
    })
      .catch(function (err) {
        return callback(boom.tooManyRequests(config.API_request_throttling_message));
      });
  });
};
