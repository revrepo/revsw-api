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

var mongoose = require('mongoose');
var boom = require('boom');
var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var dashboardService = require('../services/dashboards.js');
var Dashboard = require('../models/Dashboard');
var dashboard = new Dashboard(mongoose, mongoConnection.getConnectionPortal());
var permissionCheck = require('./../lib/requestPermissionScope');

exports.getDashboards = function getDashboards(request, reply) {
  var userId = request.auth.credentials.user_id;
  dashboard.getDashboardsByUserID(userId, function(error, listOfDashboards) {
    if (error) {
      return reply(boom.badImplementation('Failed to read dashboards list from the DB'));
    }
    var dashboards_list = publicRecordFields.handle(listOfDashboards, 'dashboards');
    renderJSON(request, reply, error, dashboards_list);
  });
};

exports.getDashboard = function getDashboard(request, reply) {
  var dashboardId = request.params.dashboard_id;

  dashboard.get({
    _id: dashboardId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Dashboard::getDashboard: Failed to get a dashboar' +
        ' Dashboard ID: ' + dashboardId));
    }

    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'dashboards')) {
      return reply(boom.badRequest('Dashboard ID not found'));
    }

    result = publicRecordFields.handle(result, 'dashboard');
    renderJSON(request, reply, error, result);

  });
};

exports.createDashboard = function createDashboard(request, reply) {
  var newDashboard = request.payload;
  var user_id = request.auth.credentials.user_id;

  dashboardService.createUserDashboard({ user_id: user_id, new_dashboard_options: newDashboard}, function(error, result) {
    if (error || !result) {
      // TODO: Change method for detect message for user ("You cannot") ?
      if(!!error && !!error.message && /You cannot /.test(error.message) === true){
        return reply(boom.badRequest(error.message));
      }
      return reply(boom.badImplementation('Failed to add new dashboard ' + newDashboard.title));
    }

    result = publicRecordFields.handle(result, 'dashboard');

    var statusResponse;
    if (result) {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully created new dashboard',
        object_id: result.id
      };

    }
    renderJSON(request, reply, error, statusResponse);
  });
};

exports.deleteDashboard = function(request, reply) {
  var dashboardId = request.params.dashboard_id;
  dashboard.get({
    _id: dashboardId
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Error retrieving Dashboard with id ' + dashboardId));
    }

    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'dashboards')) {
      return reply(boom.badRequest('Dashboard ID not found'));
    }

    dashboard.remove({
      _id: dashboardId
    }, function(error) {

      if (error) {
        return reply(boom.badImplementation('Error removing the dashboard'));
      }

      var statusResponse;
      statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the Dashboard'
      };
      // TODO: add AuditLogger ???
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.updateDashboard = function(request, reply) {
  var updatedData = request.payload;
  var id = request.params.dashboard_id;

  dashboard.get({
    _id: id
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to verify Dashboard ' + id));
    }

    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'dashboards')) {
      return reply(boom.badRequest('Dashboard not found'));
    }

    updatedData.id = id;

    dashboard.update(updatedData, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update Dashboard ' + id));
      }

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the Dashboard'
      };
      // TODO: add AuditLogger ???
      renderJSON(request, reply, error, statusResponse);
    });

  });
};
