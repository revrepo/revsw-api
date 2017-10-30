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

'use strict';

var async = require('async');
var _ = require('lodash');
var utils = require('../lib/utilities.js');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));

var mongoose = require('mongoose');
var utils = require('../lib/utilities.js');

var mongoConnection = require('../lib/mongoConnections');

var Dashboard = require('../models/Dashboard');
var dashboard = new Dashboard(mongoose, mongoConnection.getConnectionPortal());

var maxNumberOfDashboardsPerUser = config.max_number_of_dashboards_per_user;
/**
 * @name  createUserDashboard
 * @description
 *
 * @param  {Object| null }   Options
 *      {
 *        user_id:String,
 *        new_dashboard_options: Object
 *      }
 * @param  {Function} cb                  [description]
 */
exports.createUserDashboard = function(options, cb) {
  var userId = options.user_id;
  var newDashboardOptions = options.new_dashboard_options || null;
  var _defaultDashboard = {
    title: 'My Dashboard',
    structure: '6-6',
    options: {
      autorefresh: '1'
    },
    rows: [{
      columns: [{
        styleClass: 'col-md-6',
        widgets: []
      }, {
        styleClass: 'col-md-6',
        widgets: []
      }]
    }]
  };

  var newDashboard = newDashboardOptions || _defaultDashboard;
  newDashboard.user_id = userId;
  // NOTE: start workflow
  async.waterfall([
    // NOTE: step - check limit
    function(cb) {
      dashboard.getDashboardsByUserID(userId, function(err, data) {
        if (err) {
          return cb(err);
        }
        if (data.length >= maxNumberOfDashboardsPerUser) {
          var ErrorMessage_ = 'You cannot add more than ' + maxNumberOfDashboardsPerUser + ' dashboards. ' +
            'Please contact our support team if you need additional dashboards.';
          return cb(new Error(ErrorMessage_));
        }
        cb(null);
      });
    },
    // NOTE: step - create dashboard
    function(cb) {
      dashboard.add(newDashboard, function(error, result) {
        if (error) {
          logger.error('createUserDashboard::Failed to add new dashboard ' + newDashboard.title);
          cb(error);
        } else {
          logger.info('createUserDashboard::Success added new dashboard ' + newDashboard.title);
          cb(null, result);
        }
      });
    }
  ], function(err, result) {
    cb(err, result);
  });
};

/**
 * @name deleteUserDashboards
 * @description
 *
 * @param  {String}   userId
 * @param  {Function} cb
 * @return {[type]}
 */
exports.deleteDashboardsWithUserId = function(userId, cb) {
  dashboard.getDashboardsByUserID(
    userId,
    function(err, result) {
      if (err) {
        logger.error('deleteUserDashboards::Failed to get dashboards for user with Id' + userId);
        cb(err);
      }
      if (result.length > 0) {
        dashboard.removeMany({
          user_id: userId
        }, function(error, result) {
          if (error) {
            logger.error('deleteUserDashboards::Failed to delete dashboards user with Id' + userId);
            cb(error);
          } else {
            logger.info('deleteUserDashboards::Successfully deleted dashboards for user Id ' + userId);
            cb(null, result);
          }
        });
      } else {
        logger.info('deleteUserDashboards::Successfully deleted dashboards for user Id ' + userId);
        cb(null, result);
      }
    });
};
