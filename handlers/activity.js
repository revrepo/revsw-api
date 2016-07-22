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
var ApiKey = require('../models/APIKey');

var auditevents = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());
var users = new Users(mongoose, mongoConnection.getConnectionPortal());
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());

exports.getDetailedAuditInfo = function(request, reply) {
  var requestBody = {};
  var startTime;
  var endTime;
  var targetType = request.query.target_type;
  var targetId = request.query.target_id;
  var activityType = request.query.activity_type;

  var activityAccountId = request.query.account_id;
  var activityActionUserId = request.query.user_id;
  var activityActionUser = null; // NOTE: detected Action Taker

  var userId = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;

  // TODO: create  validation function checkUserAccessPermissionToTargetId
  var currentUser = null;
  // NOTE: waterfall actions list for generate response
  async.waterfall([
    /**
     * @name  prepareActivityActionUserIDandActivityUserType
     * @description
     *
     * @param  {Function} cb
     * @return {[type]}
     */
    function prepareActivityActionUserIDandActivityUserType(cb) {
      // starp preparing
      if (activityActionUserId) {
        activityActionUser = {};
        // get information about
        async.parallel({
          activityUser_: function getUserInfo(cb) {
            users.getById(activityActionUserId, function(err, result) {
              if (err) {
                cb({ errorCode: 500, err: err, message: 'Failed to retreive user details for ID ' + activityActionUserId });
                return;
              }
              if (!!result) {
                activityActionUser.user_type = 'user';
              }
              cb(null, result);
            });
          },
          activityAPIKey_: function getAPIKeyInfo(cb) {
            apiKeys.get({ _id: activityActionUserId }, function(err, result) {
              if (err) {
                cb({ errorCode: 500, err: err, message: 'Failed to retreive API key details for ID ' + activityActionUserId });
                return;
              }
              if (!!result) {
                activityActionUser.user_type = 'apikey';
              }
              cb(null, result);
            });
          },

        }, function checkPermissionsToActivityActionUser(err, results) {
          if (err) {
            cb(err);
          }
          activityActionUser.data = results.activityAPIKey_ || results.activityUser_;
          if (!!results.activityAPIKey_ || !!results.activityUser_) {
            var activityActionUserType_ = null;
            // check permission current request user to activityActionUser
            if (!!results.activityUser_) {
              if (!utils.checkUserAccessPermissionToUser(request, results.activityUser_)) {
                cb({ errorCode: 400, err: null, message: 'User ID not found!!' });
                return;
              }
              activityActionUserType_ = 'user';
            }
            if (!!results.activityAPIKey_) {
              if (!utils.checkUserAccessPermissionToAPIKey(request, results.activityAPIKey_)) {
                cb({ errorCode: 400, err: null, message: 'User ID not found' });
                return;
              }
              activityActionUserType_ = 'apikey';
            }
            //set requestBody and go to next steps
            requestBody['meta.user_id'] = activityActionUserId;
            requestBody['meta.user_type'] = activityActionUserType_;
            cb();
          } else {
            // not found USER or APIKey for sending ID(user_id)
            cb({ errorCode: 400, err: null, message: 'User ID not found-' });
          }
        });
      } else {
        // Actor User Id not set
        cb(null);
      }
    },
    /**
     * @name  prepareLimitOfAccountsInfo
     * @description
     *  If we want to see form witch account was different activity (for resselers)
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
    function prepareLimitOfAccountsInfo(cb) {
      if (activityAccountId) {
        if (!utils.checkUserAccessPermissionToAccount(request, activityAccountId)) {
          cb({ errorCode: 400, err: null, message: 'Account ID not found' });
          return;
        }
        // limit information - only one account
        requestBody['meta.account_id'] = activityAccountId;
        cb(null);
      } else {
        // we need limit data only user's accounts
        var accountIds_ = null;
        if (request.auth.credentials.user_type === 'user') {
          if (request.auth.credentials.role !== 'revadmin') {
            accountIds_ = request.auth.credentials.companyId;
          } else {
            // revadmin no have limit
            accountIds_ = null;
          }
        } else {
          accountIds_ = utils.getAccountID(request, false);
        }
        if (accountIds_) {
          requestBody['meta.account_id'] = { $in: accountIds_ };
        }
        cb(null);
      }
    },
    //
    function prepareParamActivityType(cb) {
      if (activityType) {
        requestBody['meta.activity_type'] = activityType;
      }
      cb();
    },
    //
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
      var countMonth_ = 6; // NOTE: allow to search 6 months back
      var span = utils.query2Span(request.query, 30 * 24 /*def start in hrs*/ , 24 * 31 * countMonth_ /*allowed period - 6 month*/ , false);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      startTime = span.start;
      endTime = span.end;

      requestBody['meta.datetime'] = {
        '$gte': startTime,
        '$lte': endTime
      };
      // TODO: Need to add proper indexes for the audit collection
      auditevents.detailed(requestBody, function(error, data) {
        if (error) {
          cb(error);
          return;
        }
        var result = {
          metadata: {
            user_id: activityActionUserId,
            account_id: utils.getAccountID(request, false),//accountId,
            start_time: startTime,
            end_time: endTime
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
  var startTime;
  var endTime;

  var userId = request.query.user_id ? request.query.user_id : request.auth.credentials.user_id;

  async.waterfall([

    function(cb) {
      users.getById(userId, function(err, result) {
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
          requestBody['meta.user_id'] = userId;
          break;

        case 'admin':
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
          }
          requestBody['meta.user_id'] = userId;
          break;

        case 'reseller':
          if (request.query.user_id && !utils.isArray1IncludedInArray2(user.companyId, request.auth.credentials.companyId)) {
            return reply(boom.badRequest('User ID not found'));
          }
          if (request.query.company_id && !utils.isArray1IncludedInArray2([request.query.company_id], request.auth.credentials.companyId)) {
            return reply(boom.badRequest('Account ID not found'));
          }
          if (request.query.user_id) {
            requestBody['meta.user_id'] = userId;
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
      startTime = span.start;
      endTime = span.end;

      requestBody['meta.datetime'] = {
        '$gte': startTime,
        '$lte': endTime
      };

      auditevents.summary(requestBody, function(error, data) {
        var result = {
          metadata: {
            user_id: userId,
            //domain_id  : request.query.domain_id,
            company_id: utils.getAccountID(request, false),//request.query.company_id ? request.query.company_id : user.companyId,
            start_time: startTime,
            end_time: endTime
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
