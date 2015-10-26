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

var ApiKey = require('../models/APIKey');
var Account = require('../models/Account');

var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

exports.validateAPIKey = function (request, key, callback) {
  apiKeys.get({
    key: key
  }, function(error, result) {

    if (error) {
      return callback(error, false, result);
    }

    if (!result) {
      return callback(error, false, result);
    }

    // Users without companyId data should not be able to log in
    if (!result.companyId) {
      return callback(error, false, result);
    }

    return callback(error, true, result);
  });
};
