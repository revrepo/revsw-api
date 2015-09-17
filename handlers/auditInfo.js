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

var mongoose        = require('mongoose');
var boom            = require('boom');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');

var AuditEvents = require('../models/AuditEvents');

var auditevents = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());

exports.getDetailedAuditInfo = function (request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;

  for (var key in request.query) {
    if(key !== 'to_timestamp' && key !== 'from_timestamp') {
      requestBody['meta.'+key] = request.query[key];
    }
  }
  requestBody['meta.user_id'] = request.auth.credentials.user_id;

  start_time = request.query.from_timestamp || Date.now() - (30*24*3600*1000); // 1 month back
  end_time   = request.query.to_timestamp || Date.now();

  if ( start_time >= end_time ) {
    return reply(boom.badRequest('Period end timestamp cannot be less or equal period start timestamp'));
  }

  requestBody['meta.datetime'] = {
    '$gte': start_time,
    '$lte': end_time
  };

  auditevents.detailed(requestBody, function (error, result) {
    renderJSON(request, reply, error, result);
  });
};

exports.getSummaryAuditInfo = function (request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;
  for (var key in request.query) {
    if(key !== 'to_timestamp' && key !== 'from_timestamp') {
      requestBody['meta.'+key] = request.query[key];
    }
  }
  requestBody['meta.user_id'] = request.auth.credentials.user_id;

  start_time = request.query.from_timestamp || Date.now() - (30*24*3600*1000); // 1 month back
  end_time   = request.query.to_timestamp || Date.now();

  if ( start_time >= end_time ) {
    return reply(boom.badRequest('Period end timestamp cannot be less or equal period start timestamp'));
  }

  requestBody['meta.datetime'] = {
    '$gte': start_time,
    '$lte': end_time
  };

  auditevents.summary(requestBody, function (error, result) {
    renderJSON(request, reply, error, result);
  });
};

