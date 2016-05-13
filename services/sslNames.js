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
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');

var mongoConnection = require('../lib/mongoConnections');
var SSLName = require('../models/SSLName');

var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

exports.deleteSSLNamesWithAccountId = function(accountId, cb) {
  // найти все SSL Names относящихся к AccountId
  //выполнить обновление над каждым найденным эл-том
  // логирование операций

  var getSSLNamesQuery = {
    account_id: accountId,
    deleted: {
      $ne: true
    }
  };
  sslNames.query(getSSLNamesQuery, function(error, results) {
    if (error) {
      cb(error);
    } else {
      if (results) {
        // TODO: update all records
        cb(null, results);
      } else {
        cb(null, []);
      }
    }
  });
};
