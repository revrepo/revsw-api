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

var mongoose    = require('mongoose');
var boom        = require('boom');
var config      = require('config');
var cds_request = require('request');
var renderJSON  = require('../lib/renderJSON');
var AuditLogger = require('revsw-audit');

exports.getApps = function(request, reply) {
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps', headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get list of mobile apps from the CDS'));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      renderJSON(request, reply, err, response_json);
    }
  });
};

exports.getApp = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps/' + app_id, headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get the mobile app from the CDS for App ID ' + app_id));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      renderJSON(request, reply, err, response_json);
    }
  });
};

exports.getAppConfigStatus = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps/' + app_id + '/config_status', headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get configuration status of a mobile app from the CDS for App ID ' + app_id));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      renderJSON(request, reply, err, response_json);
    }
  });
};

exports.addApp = function(request, reply) {
  var newApp = request.payload;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'POST', url: config.get('cds_url') + '/v1/apps', json: newApp, headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('CDS failed to create a new mobile app'));
    }
    var response_json = JSON.parse(JSON.stringify(body));
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      AuditLogger.store({
        ip_address      : request.info.remoteAddress,
        datetime        : Date.now(),
        user_id         : request.auth.credentials.user_id,
        user_name       : request.auth.credentials.email,
        user_type       : 'user',
        account_id      : request.auth.credentials.companyId,
        activity_type   : 'add',
        activity_target : 'app',
        target_id       : response_json.id,
        operation_status: 'success'
      });
      renderJSON(request, reply, err, response_json);
    }
  });
};

exports.updateApp = function(request, reply) {
  var app_id = request.params.app_id;
  var updatedApp = request.payload;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'PUT', url: config.get('cds_url') + '/v1/apps/' + app_id, json: updatedApp, headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('CDS failed to update the mobile app with App ID ' + app_id));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      AuditLogger.store({
        ip_address      : request.info.remoteAddress,
        datetime        : Date.now(),
        user_id         : request.auth.credentials.user_id,
        user_name       : request.auth.credentials.email,
        user_type       : 'user',
        account_id      : request.auth.credentials.companyId,
        activity_type   : 'modify',
        activity_target : 'app',
        target_id       : response_json.id,
        operation_status: 'success'
      });
      renderJSON(request, reply, err, response_json);
    }
  });
};

exports.deleteApp = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'DELETE', url: config.get('cds_url') + '/v1/apps/' + app_id, headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('CDS failed to delete the mobile app with App ID ' + app_id));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      AuditLogger.store({
        ip_address      : request.info.remoteAddress,
        datetime        : Date.now(),
        user_id         : request.auth.credentials.user_id,
        user_name       : request.auth.credentials.email,
        user_type       : 'user',
        account_id      : request.auth.credentials.companyId,
        activity_type   : 'delete',
        activity_target : 'app',
        target_id       : response_json.id,
        operation_status: 'success'
      });
      renderJSON(request, reply, err, response_json);
    }
  });
};
