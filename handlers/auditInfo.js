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
var boom     = require('boom');
var async    = require('async');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');
var utils           = require('../lib/utilities');

var AuditEvents = require('../models/AuditEvents');
var Users       = require('../models/User');

var auditevents = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());
var users       = new Users(mongoose, mongoConnection.getConnectionPortal());

exports.getDetailedAuditInfo = function (request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;

  var user_id = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;

  async.waterfall([

    function (cb) {
      users.getById(user_id, function (err, result) {
        if (err || !result) {
          return reply(boom.badRequest('User not found'));
        }
        cb(null, result);
      });
    },

    function (user) {

      switch (request.auth.credentials.role) {

        case 'user' :
          if (request.query.user_id && request.query.user_id !== request.auth.credentials.user_id) {
            return reply(boom.badRequest('User not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Company not found'));
          }
          requestBody['meta.user_id']    = user_id;

          break;

        case 'admin' :
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Company not found'));
          }
          requestBody['meta.user_id']    = user_id;

          break;

        case 'reseller' :
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Company not found'));
          }
          if (request.query.user_id) {
            requestBody['meta.user_id'] = user_id;
          }

          break;
      }

      requestBody['meta.account_id'] = {
        '$in' : request.query.company_id ? [request.query.company_id] : user.companyId
      };

      delete request.query.user_id;
      delete request.query.company_id;

      for (var key in request.query) {
        if (key !== 'to_timestamp' && key !== 'from_timestamp') {
          requestBody['meta.' + key] = request.query[key];
        }
      }

      if ( request.query.from_timestamp ) {
        start_time = utils.convertDateToTimestamp(request.query.from_timestamp);
        if ( ! start_time ) {
          return reply(boom.badRequest('Cannot parse the from_timestamp value'));
        }
      } else {
        start_time = Date.now() - (30 * 24 * 3600 * 1000); // 1 month back
      }

      if ( request.query.to_timestamp ) {
        end_time = utils.convertDateToTimestamp(request.query.to_timestamp);
        if ( ! end_time ) {
          return reply(boom.badRequest('Cannot parse the to_timestamp value'));
        }
      } else {
        end_time = request.query.to_timestamp || Date.now();
      }

      if (start_time >= end_time) {
        return reply(boom.badRequest('Period end timestamp cannot be less or equal period start timestamp'));
      }

      requestBody['meta.datetime'] = {
        '$gte' : start_time,
        '$lte' : end_time
      };

      auditevents.detailed(requestBody, function (error, data) {
        var result = {
          metadata : {
            user_id    : user_id,
            //domain_id  : request.query.domain_id,
            company_id : request.query.company_id ? request.query.company_id : user.companyId,
            start_time : start_time,
            end_time   : end_time
          },
          data : data
        };
        renderJSON(request, reply, error, result);
      });
    }
  ], function (err) {
    if (err) {
      return reply(boom.badImplementation('Failed to execute activity log'));
    }
  });
};

exports.getSummaryAuditInfo = function (request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;

  var user_id = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;

  async.waterfall([

    function (cb) {
      users.getById(user_id, function (err, result) {
        if (err || !result) {
          return reply(boom.badRequest('User not found'));
        }
        cb(null, result);
      });
    },

    function (user) {

      switch (request.auth.credentials.role) {

        case 'user' :
          if (request.query.user_id && request.query.user_id !== request.auth.credentials.user_id) {
            return reply(boom.badRequest('User not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Company not found'));
          }
          requestBody['meta.user_id']    = user_id;
          break;

        case 'admin' :
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Company not found'));
          }
          requestBody['meta.user_id']    = user_id;
          break;

        case 'reseller' :
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Company not found'));
          }
          if (request.query.user_id) {
            requestBody['meta.user_id'] = user_id;
          }
          break;
      }

      requestBody['meta.account_id'] = request.query.company_id ? request.query.company_id : user.companyId;

      delete request.query.user_id;
      delete request.query.company_id;

      for (var key in request.query) {
        if (key !== 'to_timestamp' && key !== 'from_timestamp') {
          requestBody['meta.' + key] = request.query[key];
        }
      }
      requestBody['meta.user_id'] = request.auth.credentials.user_id;

      if ( request.query.from_timestamp ) {
        start_time = utils.convertDateToTimestamp(request.query.from_timestamp);
        if ( ! start_time ) {
          return reply(boom.badRequest('Cannot parse the from_timestamp value'));
        }
      } else {
        start_time = Date.now() - (30 * 24 * 3600 * 1000); // 1 month back
      }

      if ( request.query.to_timestamp ) {
        end_time = utils.convertDateToTimestamp(request.query.to_timestamp);
        if ( ! end_time ) {
          return reply(boom.badRequest('Cannot parse the to_timestamp value'));
        }
      } else {
        end_time = request.query.to_timestamp || Date.now();
      }

      if (start_time >= end_time) {
        return reply(boom.badRequest('Period end timestamp cannot be less or equal period start timestamp'));
      }

      requestBody['meta.datetime'] = {
        '$gte' : start_time,
        '$lte' : end_time
      };

      auditevents.summary(requestBody, function (error, data) {
        var result = {
          metadata : {
            user_id    : user_id,
            //domain_id  : request.query.domain_id,
            company_id : request.query.company_id ? request.query.company_id : user.companyId,
            start_time : start_time,
            end_time   : end_time
          },
          data : data
        };
        renderJSON(request, reply, error, result);
      });
    }
    ], function (err) {
      if (err) {
        return reply(boom.badImplementation('Failed to execute activity log'));
      }
  });
};

