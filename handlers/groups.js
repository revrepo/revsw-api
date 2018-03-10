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

var boom = require('boom');
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var AuditLogger = require('../lib/audit');
var speakeasy = require('speakeasy');
var config = require('config');
var Promise = require('bluebird');

var utils = require('../lib/utilities.js');
var dashboardService = require('../services/dashboards.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var User = require('../models/User');
var Group = require('../models/Group');
var Account = require('../models/Account');
var DomainConfig = require('../models/DomainConfig');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var groups = Promise.promisifyAll(new Group(mongoose, mongoConnection.getConnectionPortal()));

/**
 * @name getGroups
 * @description method get all groups
 */
exports.getGroups = function getGroups(request, reply) {
  var filters_ = request.query.filters;
  var accountIds = utils.getAccountID(request);
  var options = {};
  if (!!filters_ && filters_.account_id) {
    if (!utils.checkUserAccessPermissionToAccount(request, filters_.account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }
    options.account_id = filters_.account_id;
  } else {
    // NOTE: set limit accounts if user is not RevAdmin
    if (!utils.isUserRevAdmin(request)) {
      options.account_id = accountIds;
    }
  }

  groups.list(options).then(function (listOfGroups) {
    if (listOfGroups.length === 0 && !filters_) {
      return reply(boom.badImplementation('Failed to get a list of groups (there should be at least one group in the list)'));
    }
    listOfGroups = _.filter(listOfGroups, function (itemGroup) {
      if (!utils.checkUserAccessPermissionToGroup(request, itemGroup)) {
        return false;
      }
      return true;
    });
    listOfGroups = publicRecordFields.handle(listOfGroups, 'groups');

    renderJSON(request, reply, null, listOfGroups);
  }).catch(function (err) {
    return reply(boom.badRequest(err));
  });
};
/**
 * @name createGroup
 * @description
 *   Create new Group
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.createGroup = function (request, reply) {
  var newGroup = request.payload;
  var _createdGroup;
  // NOTE: set default companyId
  if ((newGroup.account_id === undefined || newGroup.account_id.length === 0) && utils.getAccountID(request).length !== 0) {
    newGroup.account_id = utils.getAccountID(request);
  }

  // NOTE: New User must have "account_id"
  if (newGroup.account_id === undefined || newGroup.account_id.length === 0) {
    return reply(boom.badRequest('You have to specify account_id if your group does not have a valid account_id attribute'));
  }
  // NOTE: Who is creating new User must have access to the user after creation
  if (!utils.checkUserAccessPermissionToUser(request, newGroup)) {
    // TODO: fix the error message text "You don't have permissions for this action "
    return reply(boom.badRequest('Your group does not manage the specified company ID(s)'));
  }

  var accountId = newGroup.account_id[0];

  var statusResponse;
  async.waterfall([
    function (cb) {
      newGroup.created_by = request.auth.credentials.email;
      newGroup.created_at = Date.now();
      newGroup.updated_at = Date.now();
      groups.add(newGroup).then(function (group) {
        _createdGroup = group;
        cb(null);
      }).catch(function (err) {
        return reply(boom.badRequest(err));
      });
    },
    function (cb) {
      // TODO: add activity log to all accounts (not only newGroup.companyId[0])
      AuditLogger.store({
        account_id: accountId,
        activity_type: 'add',
        activity_target: 'group',
        target_id: _createdGroup.id,
        target_name: _createdGroup.name,
        target_object: _createdGroup,
        operation_status: 'success'
      }, request);
      cb();
    },
    function (cb) {
      if (!!_createdGroup) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully created new group',
          object_id: _createdGroup.id
        };
      }
      cb(null, statusResponse);
    }
  ], function (error, statusResponse) {
    renderJSON(request, reply, error, statusResponse);
  });
};

/**
 * @name getGroup
 * @description
 *   Get a single group
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.getGroup = function (request, reply) {

  var id = request.params.group_id;
  groups.getById(id).then(function (group) {
    var result = publicRecordFields.handle(group, 'group');
    renderJSON(request, reply, null, result);
  }).catch(function (err) {
    return reply(boom.badRequest(err));
  });
};

/**
 * @name updateGroup
 * @description
 *   Updates a group
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.updateGroup = function (request, reply) {
  var updateGroupData = request.payload;
  var groupAccountId;
  var groupId;
  var statusResponse;
  var storedGroupData;
  var resultGroupData;

  async.waterfall([
    function (cb) {
      if (Object.keys(updateGroupData).length === 0) {
        return cb('No attributes specified');
      }

      groupId = request.params.group_id;
      updateGroupData.id = groupId;

      cb();
    },
    function (cb) {
      updateGroupData.updated_at = Date.now();
      groups.update(updateGroupData).then(function (result) {
        resultGroupData = publicRecordFields.handle(result, 'group');
        cb();
      }).catch(function (err) {
        return reply(boom.badRequest(err));
      });

    },
    function (cb) {
      AuditLogger.store({
        account_id: groupAccountId,
        activity_type: 'modify',
        activity_target: 'group',
        target_id: resultGroupData.id,
        target_name: resultGroupData.name,
        target_object: resultGroupData,
        operation_status: 'success'
      }, request);
      cb();
    },
    function (cb) {
      if (!!resultGroupData) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully updated the group'
        };
      }
      cb(null, statusResponse);
    }
  ], function (error, statusResponse) {
    renderJSON(request, reply, error, statusResponse);
  });
};

/**
 * @name deleteGroup
 * @description
 *   Delete a group
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.deleteGroup = function (request, reply) {
  var id = request.params.group_id;

  // get our group
  groups.getById(id).then(function (result) {
    if (!result || !utils.checkUserAccessPermissionToGroup(request, result)) {
      return reply(boom.badRequest('Group not found'));
    }

    // get users by group id, check if our group has users in it before we delete it
    users.list({ group_id: id }, function (err, users) {
      if (err) {
        return reply(boom.badRequest(err));
      }

      if (users) {
        return reply(boom.badRequest('Cannot delete a group with users'));
      }

      if (!err && !users) {
        // ok no users, lets delete it!
        var account_id = result.account_id[0];

        result = publicRecordFields.handle(result, 'group');

        var auditRecord = {
          ip_address: utils.getAPIUserRealIP(request),
          datetime: Date.now(),
          user_id: request.auth.credentials.user_id,
          user_name: request.auth.credentials.email,
          user_type: 'user',
          account_id: account_id,
          activity_type: 'delete',
          activity_target: 'group',
          target_id: result.id,
          target_name: result.name,
          target_object: result,
          operation_status: 'success'
        };

        groups.removeById(id).then(function (result) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully deleted the group'
          };

          AuditLogger.store(auditRecord);

          renderJSON(request, reply, null, statusResponse);
        }).catch(function (err) {
          return reply(boom.badRequest(err));
        });
      }

      return reply(boom.badImplementation());
    });
  }).catch(function (err) {
    return reply(boom.badRequest(err));
  });
};