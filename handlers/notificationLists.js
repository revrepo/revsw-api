/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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
var mongoose = require('mongoose');
var Promise = require('bluebird');
var boom = require('boom');
var config = require('config');
var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var utils = require('../lib/utilities.js');
var publicRecordFields = require('../lib/publicRecordFields');
var AuditLogger = require('../lib/audit');
var emailer = require('./../services/email');

var Account = require('../models/Account');
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

var User = require('../models/User');
var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));

var NotificationList = require('../models/NotificationList');

var notificationList = new NotificationList(mongoose, mongoConnection.getConnectionPortal());
var permissionCheck = require('./../lib/requestPermissionScope');
/**
 * @name creataNotificationList
 * @description method for creating new Notification List
 */
exports.createNotificationList = function(request, reply) {
  var payloadData = request.payload;
  var accountId = payloadData.account_id;
  var notificationListName = payloadData.list_name;

  if (!accountId || !permissionCheck.checkPermissionsToResource(request, {
      id: accountId
    }, 'accounts')) {
    return reply(boom.badRequest('Account ID not found'));
  }
  var createdBy = utils.generateCreatedByField(request);
  var newNotification = {
    account_id: accountId,
    list_name: notificationListName,
    updated_by: createdBy,
    created_by: createdBy
  };

  notificationList.add(newNotification, function(error, result) {
    if (error || !result) {
      return reply(boom.badImplementation('Failed to add new Notification List  "' + notificationListName + '"'));
    }

    var statusResponse;
    result = publicRecordFields.handle(result, 'notificationList');

    if (result) {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully created new Notification List',
        object_id: result.id
      };

      AuditLogger.store({
        account_id: newNotification.account_id,
        activity_type: 'add',
        activity_target: 'notification_list',
        target_id: result.id,
        target_name: result.list_name,
        target_object: result,
        operation_status: 'success'
      }, request);

      renderJSON(request, reply, error, statusResponse);
    }
  });
};
/**
 * @name getNotificationLists
 * @description get Notification Lists
 */
exports.getNotificationLists = function(request, reply) {
  var accountId = request.query.account_id;
  var options = {};
  // NOTE: check an access permissition
  if (!!accountId && !permissionCheck.checkPermissionsToResource(request, {
      id: accountId
    }, 'accounts')) {
    return reply(boom.badRequest('Notification List ID not found'));
  }
  // NOTE: if accountId is 'null' when should return notification lists configured for the user’s account
  if (!accountId && !utils.isUserRevAdmin(request)) {
    options.account_id = {
      $in: utils.getAccountID(request)
    };
  }
  // NOTE: get data only for one account
  if (!!accountId) {
    options.account_id = {
      $in: [accountId]
    };
  }

  notificationList.list(options, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the database a Notification Lists'));
    }
    if (result) {
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('No Notification Lists are registered in the system'));
    }
  });
};

/**
 *
 */
exports.updateNotificationList = function(request, reply) {
  var notificationListId = request.params.list_id;
  var notificationListData = request.payload;

  notificationList.get({
    _id: notificationListId,
    deleted: {
      $ne: true
    }
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve Notification List details for ID ' + notificationListId));
    }
    if (!result) {
      return reply(boom.badRequest('Notification List ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, {
        id: result.account_id
      }, 'accounts')) {
      return reply(boom.badRequest('Account ID not found'));
    }

    notificationListData._id = notificationListId;
    notificationListData.updated_by = utils.generateCreatedByField(request);
    // TODO: add checks for find changes
    notificationList.checkReasonForUpdate(notificationListData, result, function(err, diffs) {
      if (err || !diffs || diffs.isDiff === false) {
        return renderJSON(request, reply, err, result);
      } else {
        notificationList.update(notificationListData,
          function(err, result) {
            if (err) {
              return reply(boom.badImplementation('Failed to update the Notification List with ID ' + notificationListId));
            }
            if (!result) {
              return reply(boom.badRequest('Cannot update the Notification List with ID ' + notificationListId));
            }
            var response_json = publicRecordFields.handle(result, 'notificationList');

            notificationList.id = notificationListId;
            AuditLogger.store({
              account_id: result.account_id,
              activity_type: 'modify',
              activity_target: 'notification_list',
              target_id: notificationListId,
              target_name: response_json.list_name,
              target_object: response_json,
              operation_status: 'success'
            }, request);
            return renderJSON(request, reply, err, response_json);
          });
      }


    });


  });
};
/**
 * @name deleteNotificationList
 * @description method for delete Notification List
 */

exports.deleteNotificationList = function(request, reply) {
  var notificationListId = request.params.list_id;
  notificationList.get({
    _id: notificationListId
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Error retrieving Notification List with id ' + notificationListId));
    }
    var options = {};
    // NOTE: check an access permissition
    if (!result || !permissionCheck.checkPermissionsToResource(request, {
        id: result.account_id
      }, 'accounts')) {
      return reply(boom.badRequest('Notification List ID not found'));
    }

    notificationList.remove({
      _id: notificationListId
    }, function(error) {
      if (error) {
        return reply(boom.badImplementation('Error removing the Notification List'));
      }

      var statusResponse;
      statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the Notification List'
      };

      result = publicRecordFields.handle(result, 'notificationList');

      AuditLogger.store({
        account_id: result.account_id,
        activity_type: 'delete',
        activity_target: 'notification_list',
        target_id: result.id,
        target_name: result.list_name,
        target_object: result,
        operation_status: 'success'
      }, request);
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.sendNotificationToList = function(request, reply) {
  var alerterToken = request.headers['x-trafficalerter-token'];
  if (!alerterToken || (alerterToken !== config.traffic_alerter.token)) {
    // send a 404 not found, we want to keep this endpoint private, only for revsw-trafficalerter.
    return reply(boom.notFound());
  }

  var notificationListId = request.params.list_id;
  var notificationContent = request.payload.notification_content;
  var notificationTitle = request.payload.notification_title;

  if (!notificationContent || notificationContent === '') {
    return reply(boom.badRequest('Notification content is empty'));
  }
  notificationList.get({
    _id: notificationListId
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Error retrieving Notification List with id ' + notificationListId));
    }

    if (!result) {
      return reply(boom.badRequest('Notification List ID not found'));
    }

    if (!result.destinations) {
      return reply(boom.badRequest('Notification List has no destinations'));
    }
    var accountId = result.account_id;
    var vendorProfile = '';
    var destinationsList = result.destinations;
    async.waterfall([
      // NOTE: get vendor name for send email
      function(cb) {
        accounts.get({
          id: accountId
        }, function(err, result) {
          if (err) {
            return cb(err);
          }
          if (!!result) {
            vendorProfile = result.vendor_profile;
          }
          cb();
        });
      },
      // send all type notifications
      function(cb) {
        const sendParams = {
          notificationContent: notificationContent,
          notificationTitle: notificationTitle,
          vendorProfile: vendorProfile
        };
        async.map(destinationsList, function(dest, callback) {
          var report = {
            send: false,
            destination: dest
          };
          switch (dest.destination_type) {
            case 'email':
              if (!dest.email || dest.email === '') {
                report.reason = 'Notification List Destination has no email';
                return callback(null, report);
              }
              sendParams.userEmail = dest.email;
              emailer.sendNotificationEmail(sendParams, function(err, res) {
                if (err) {
                  report.send = false;
                  report.reason = err.message;
                } else {
                  report.send = true;
                  report.result = res;
                }
                callback(null, report);
              });
              break;

            case 'user':
              if (!dest.user_id || dest.user_id === '') {
                report.reason = 'Notification List Destination has no valid user_id';
                return callback(null, report);
              }
              users.getById(dest.user_id, function(err, userInfo) {
                if (err) {
                  report.reason = 'Notification List Destination has no valid user_id';
                  return callback(null, report);
                }
                sendParams.userEmail = userInfo.email;
                emailer.sendNotificationEmail(sendParams, function(err, res) {
                  if (err) {
                    report.send = false;
                    report.reason = err.message;
                  } else {
                    report.send = true;
                    report.result = res;
                  }
                  callback(null, report);
                });
              });
              break;
            default:
              callback(null, {
                destination: dest,
                send: false,
                reason: 'Not implemented'
              });
              break;
          }

        }, function(err, results) {
          if (err) {
            return cb(boom.badRequest(err));
          }
          return cb(null, results);
        });
      }
    ], function(err, reports) {
      if (err) {
        return reply(boom.badRequest(err));
      }
      return reply(reports);
    });

  });
};
