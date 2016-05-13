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
var utils = require('../lib/utilities.js');
var async = require('async');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');

var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var SSLCertificate = require('../models/SSLCertificate');
var sslCertificates = new SSLCertificate(mongoose, mongoConnection.getConnectionPortal());

/**
 * @name deletePrivateSSLCertificatesWithAccountId
 * @description
 *
 * @param  {[type]}   accountId [description]
 * @param  {[type]}   options   [description]
 * @param  {Function} cb        [description]
 * @return {[type]}             [description]
 */
exports.deletePrivateSSLCertificatesWithAccountId = function(accountId, options, cb) {
  var getPrivateSSLCertificatesQuery = {
    account_id: accountId,
    cert_type: 'private',
    deleted: {
      $ne: true
    }
  };

  sslCertificates.query(getPrivateSSLCertificatesQuery, function(error, results) {
    if (error) {
      cb(error);
    } else {
      if (results) {
        var callCDS = [];
        // TODO: update all records with
        _.forEach(results,function(item) {
          callCDS.push(function (callback) {
            //
            callback(null, item.id);
          });
        });
        // console.log(callCDS);
        async.parallel(callCDS, function(err,data) {
          // console.log('----',err,data)
          cb(null, data);
        });

      } else {
        cb(null, []);
      }
    }
  });
};
