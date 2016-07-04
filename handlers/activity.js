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

var async = require('async');
var boom = require('boom');
var mongoConnection = require('../lib/mongoConnections');
var mongoose = require('mongoose');
var renderJSON = require('../lib/renderJSON');
var utils = require('../lib/utilities');

var AuditEvents = require('../models/AuditEvents');
var Users = require('../models/User');
var DomainConfig = require('../models/DomainConfig');

var auditevents = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());
var users = new Users(mongoose, mongoConnection.getConnectionPortal());
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

exports.getDetailedAuditInfo = function(request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;
  var targetType = request.query.target_type;
  var targetId = request.query.target_id;
  var user_id = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;
  var account_id;
  if (request.auth.credentials.user_type === 'user') {
    account_id = request.query.account_id ? request.query.account_id : request.auth.credentials.companyId[0];
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

  var currentUser = null;
  // NOTE: waterfall actions list for generate response
  async.waterfall([

    function getUserInfo(cb) {
      users.getById(user_id, function(err, result) {
        if (err) {
          cb({ errorCode: 500, err: err, message: 'Failed to retreive user details for ID ' + user_id });
          return;
        }
        if (!result) {
          cb({ errorCode: 400, err: null, message: 'User ID not found' });
          return;
        }
        currentUser = result;
        cb(null);
      });
    },

    function checkUserPermissions(cb) {
      var user = currentUser;
      switch (request.auth.credentials.role) {
        case 'revadmin':
          cb();
          break;
        case 'user':
          if (request.query.user_id && request.query.user_id !== request.auth.credentials.user_id) {
            cb({ errorCode: 400, err: null, message: 'User ID not found' });
            return;
          }
          if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
            cb({ errorCode: 400, err: null, message: 'Account ID not found' });
            return;
          }
          //    requestBody['meta.user_id'] = user_id;
          //    requestBody['meta.account_id'] = account_id;
          cb();
          break;

        case 'admin':
          if (request.query.user_id && !utils.checkUserAccessPermissionToUser(request, user)) {
            cb({ errorCode: 400, err: null, message: 'User ID not found' });
            return;
          }
          if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
            cb({ errorCode: 400, err: null, message: 'Account ID not found' });
            return;
          }
          // requestBody['meta.account_id'] = account_id;
          cb();
          break;

        case 'reseller':
          if (request.query.user_id && !utils.checkUserAccessPermissionToUser(request, user)) {
            cb({ errorCode: 400, err: null, message: 'User ID not found' });
            return;
          }
          if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
            cb({ errorCode: 400, err: null, message: 'Account ID not found' });
            return;
          }
          //  requestBody['meta.account_id'] = account_id;
          cb();
          break;
        default:
          cb({ errorCode: 500, err: null, message: 'User Role not found' });
          break;
      }
    },

    function prepareParams(cb) {
      // NOTE: set filter for get only one type Activity Target
      if (targetType) {
        requestBody['meta.activity_target'] = targetType;
      }
      // NOTE: set filter for get list Activities for Activity Target(Type) with ID
      if (targetType && targetId) {
        requestBody['meta.activity_target'] = targetType;
        if (targetType === 'purge') {
          // NOTE: for 'purge' type action  "target_id" - is domain id because purge object
          // can't be change and have only one relation with one domain
          domainConfigs.get(targetId, function(error, result) {
            if (error) {
              cb({ errorCode: 500, err: error, message: 'Failed to retrieve details for target ID ' + targetId });
              return;
            }

            if (!result || !utils.checkUserAccessPermissionToDomain(request, result)) {
              cb({ errorCode: 400, err: null, message: 'Target ID not found' });
              return;
            }
            requestBody['meta.target_name'] = result.domain_name;
            cb();
          });
        } else {
          requestBody['meta.target_id'] = targetId;
          cb();
        }
      } else {
        cb();
      }
    },

    function prepareDataAndSendResponse(cb) {

      var span = utils.query2Span(request.query, 30 * 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ , false);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      start_time = span.start;
      end_time = span.end;

      requestBody['meta.datetime'] = {
        '$gte': start_time,
        '$lte': end_time
      };
      // TODO: Need to add proper indexes for the audit collection
      auditevents.detailed(requestBody, function(error, data) {
        if (error) {
          cb(error);
          return;
        }
        var result = {
          metadata: {
            user_id: user_id,
            account_id: account_id,
            start_time: start_time,
            end_time: end_time
          },
          data: data
        };
        renderJSON(request, reply, error, result);
      });
    }
  ], function(err) {
    if (err) {
      if (err.errorCode && err.message) {
        switch (err.errorCode) {
          case 400:
            reply(boom.badRequest(err.message));
            break;
          default:
            reply(boom.badImplementation(err.message, request.query));
            break;
        }
      } else {
        return reply(boom.badImplementation('Failed to execute activity log query, request: ' + JSON.stringify(request.query)));
      }
    }
  });
};

// TODO: the Summary function is a mess - need to do a full review
exports.getSummaryAuditInfo = function(request, reply) {
  var requestBody = {};
  var start_time;
  var end_time;

  var user_id = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;

  async.waterfall([

    function(cb) {
      users.getById(user_id, function(err, result) {
        if (err || !result) {
          return reply(boom.badRequest('User ID not found'));
        }
        cb(null, result);
      });
    },

    function(user) {

      switch (request.auth.credentials.role) {

        case 'user':
          if (request.query.user_id && request.query.user_id !== request.auth.credentials.user_id) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
          }
          requestBody['meta.user_id'] = user_id;
          break;

        case 'admin':
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
          }
          requestBody['meta.user_id'] = user_id;
          break;

        case 'reseller':
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

      var span = utils.query2Span(request.query, 30 * 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ , false);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      start_time = span.start;
      end_time = span.end;

      requestBody['meta.datetime'] = {
        '$gte': start_time,
        '$lte': end_time
      };

      auditevents.summary(requestBody, function(error, data) {
        var result = {
          metadata: {
            user_id: user_id,
            //domain_id  : request.query.domain_id,
            company_id: request.query.company_id ? request.query.company_id : user.companyId,
            start_time: start_time,
            end_time: end_time
          },
          data: data
        };
        renderJSON(request, reply, error, result);
      });
    }
  ], function(err) {
    if (err) {
      return reply(boom.badImplementation('Failed to execute activity log'));
    }
  });
};
