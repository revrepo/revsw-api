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
  var account_id;
  if(request.auth.credentials.user_type === 'user'){
    account_id =  request.query.account_id ? request.query.account_id : request.auth.credentials.companyId[0];
  } else {
    account_id = utils.getAccountID(request, true);
  }

  if (request.query.user_id) {
    requestBody['meta.user_id'] = user_id;
  }
  if (request.query.account_id) {
    requestBody['meta.account_id'] = account_id;
  }

  if (!request.query.user_id && !request.query.account_id) {
    requestBody['meta.user_id'] = user_id;
  }

  async.waterfall([

    function (cb) {
      users.getById(user_id, function (err, result) {
        if (err) {
          return reply(boom.badImplementation('Failed to retreive user details for ID ' + user_id));
        }
        if (!result) {
          return reply(boom.badRequest('User ID not found'));
        }
        cb(null, result);
      });
    },

    function (user) {

      switch (request.auth.credentials.role) {

        case 'user':
          if (request.query.user_id && request.query.user_id !== request.auth.credentials.user_id) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
            return reply(boom.badRequest('Account ID not found'));
          }
      //    requestBody['meta.user_id'] = user_id;
      //    requestBody['meta.account_id'] = account_id;

          break;

        case 'admin':
          if (request.query.user_id && !utils.checkUserAccessPermissionToUser(request, user)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
            return reply(boom.badRequest('Account ID not found'));
          }
         // requestBody['meta.account_id'] = account_id;

          break;

        case 'reseller':
          if (request.query.user_id && !utils.checkUserAccessPermissionToUser(request, user)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
            return reply(boom.badRequest('Account ID not found'));
          }
        //  requestBody['meta.account_id'] = account_id;

          break;
      }

      var span = utils.query2SpanNoRound( request.query, 30 * 24 /*def start in hrs*/, 24 * 31 /*allowed period - month*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }
      start_time = span.start;
      end_time = span.end;

      requestBody['meta.datetime'] = {
        '$gte' : start_time,
        '$lte' : end_time
      };
      // TODO: Need to add proper indexes for the audit collection
      auditevents.detailed(requestBody, function (error, data) {
        var result = {
          metadata : {
            user_id    : user_id,
            account_id : account_id,
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
      return reply(boom.badImplementation('Failed to execute activity log query, request: ' + JSON.stringify(request.query)));
    }
  });
};

// TODO: the Summary function is a mess - need to do a full review
exports.getSummaryAuditInfo = function (request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;

  var user_id = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;

  async.waterfall([

    function (cb) {
      users.getById(user_id, function (err, result) {
        if (err || !result) {
          return reply(boom.badRequest('User ID not found'));
        }
        cb(null, result);
      });
    },

    function (user) {

      switch (request.auth.credentials.role) {

        case 'user' :
          if (request.query.user_id && request.query.user_id !== request.auth.credentials.user_id) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
          }
          requestBody['meta.user_id']    = user_id;
          break;

        case 'admin' :
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
          }
          requestBody['meta.user_id']    = user_id;
          break;

        case 'reseller' :
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
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

      var span = utils.query2SpanNoRound( request.query, 30 * 24 /*def start in hrs*/, 24 * 31 /*allowed period - month*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }
      start_time = span.start;
      end_time = span.end;

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

