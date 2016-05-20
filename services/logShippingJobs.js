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

var LogShippingJob = require('../models/LogShippingJob');
var logShippingJobs = new LogShippingJob(mongoose, mongoConnection.getConnectionPortal());

/**
 * @name  deleteJobsWithAccountId
 * @description
 *
 *   Delete Log Shipping Job with Account Id
 *
 * @param  {[type]}   accountId [description]
 * @param  {Function} cb        [description]
 * @return {[type]}             [description]
 */
exports.deleteJobsWithAccountId = function(accountId, cb) {
  logger.info('deleteJobsWithAccountId:Accotin Id' + accountId);

  logShippingJobs.queryP({
    account_id: accountId
  }, function(err, data) {
    if (!err) {
      if (data.length >= 0) {
        async.eachSeries(data, function(item, cb_item) {
          logShippingJobs.remove({
            _id: item._id
          }, function(err) {
            if (err) {
              logger.error('deleteJobsWithAccountId:error: job id ' + item._id + '(' + JSON.stringify(err) + ')');
            } else {
              logger.info('deleteJobsWithAccountId:succes job id ' + item._id);
            }
            cb_item(!!err);
          });
        }, function(err) {
          cb(err);
        });
      } else {
        cb(null);
      }
    } else {
      logger.error('deleteJobsWithAccountId:error' + JSON.stringify(err));
      cb(err);
    }
  });

};
