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

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));

var mongoose = require('mongoose');
var utils = require('../lib/utilities.js');

var mongoConnection = require('../lib/mongoConnections');

var Dashboard = require('../models/Dashboard');
var dashboard = new Dashboard(mongoose, mongoConnection.getConnectionPortal());

/**
 * @name  createUserDashboard
 * @description
 *
 *
 *
 * @param  {Staring}   user_id
 * @param  {Object| null }   newDashboardOptions
 * @param  {Function} cb                  [description]
 * @return {[type]}                       [description]
 */
exports.createUserDashboard = function(user_id, newDashboardOptions, cb) {
  var _defaultDashboard = {
    title: 'My Dashboard',
    rows: [{
      columns: [{
        styleClass: 'col-md-12',
        widgets: []
      }]
    }]
  };

  var newDashboard = newDashboardOptions || _defaultDashboard;
  newDashboard.user_id = user_id;
  dashboard.add(newDashboard, function(error, result) {
    if (error) {
      logger.error('createUserDashboard::Failed to add new dashboard ' + newDashboard.title);
      cb(error);
    } else {
      logger.info('createUserDashboard::Failed to add new dashboard ' + newDashboard.title);
      cb(null, result);
    }
  });
};
