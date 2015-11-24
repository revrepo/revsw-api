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
var config   = require('config');

var utils           = require('../lib/utilities.js');
var apiAccessPermissions     = require('../lib/apiAccessPermissions.js');
var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

//
// This function is used by HAPI to perform user authentication and authorization
//
function UserAuth (request, username, password, callback) {
  users.get({
    email: username
  }, function(error, result) {

    if (!result) {
      return callback(null, false);
    }

    // Users without companyId data should not be able to log in
    if (result.role !== 'revadmin' && !result.companyId) {
      return callback(null, false);
    }

    result.scope = apiAccessPermissions.getPermissionScopes(result);

    var passHash = utils.getHash(password);

    if (passHash === result.password || passHash === config.get('master_password')) {
      callback(error, true, result);
    } else {
      callback(error, false, result);
    }
  });
}

module.exports = UserAuth;
