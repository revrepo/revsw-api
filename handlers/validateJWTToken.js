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

var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

exports.validateJWTToken = function (request, decodedToken, callback) {
  var user_id = decodedToken.user_id,
    password = decodedToken.password;

  users.get({
    _id: user_id, password: password
  }, function(error, result) {

    if (!result) {
      return callback(error, false, result);
    }

    // Users without account_id data should not be able to log in
    if (result.role !== 'revadmin' && !result.account_id) {
      return callback(error, false, result);
    }

    result.scope = [];

    result.scope.push(result.role);
    if (!result.access_control_list.readOnly) {
      result.scope.push(result.role + '_rw');
    }

    return callback(error, true, result);
  });
};
