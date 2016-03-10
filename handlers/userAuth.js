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
var mongoConnection = require('../lib/mongoConnections');
var logger = require('revsw-logger')(config.log_config);

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
      logger.error('UserAuth:: User ' + username + ' with role ' + result.role +
        ' has empty companyId attribute - blocking the access');
      return callback(null, false);
    }

    result.scope = [];
    result.scope.push(result.role);
    if (!result.access_control_list.readOnly) {
      result.scope.push(result.role + '_rw');
    }

    logger.debug('UserAuth:: User ' + username + ' with role ' + result.role +
      ' is assigned with scopes ' + result.scope);

    var passHash = utils.getHash(password);
    if (passHash === result.password || passHash === config.get('master_password')) {
      callback(error, true, result);
    } else {
      logger.warn('UserAuth:: User ' + username + ' with role ' + result.role +
        ' is trying to access using a wrong password - blocking the access'); 
      callback(error, false, result);
    }
  });
}

module.exports = UserAuth;
