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
var APIKey = require('../models/APIKey');
var Group = require('../models/Group');
var Account = require('../models/Account');
var DomainConfig = require('../models/DomainConfig');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var groups = Promise.promisifyAll(new Group(mongoose, mongoConnection.getConnectionPortal()));
var APIkeys = Promise.promisifyAll(new APIKey(mongoose, mongoConnection.getConnectionPortal()));
var permissionCheck = require('./../lib/requestPermissionScope');
/**
 * @name getGroups
 * @description method get all groups
 */
exports.getGroups = function getGroups(request, reply) {
  var filters_ = request.query.filters;
  var accountIds = utils.getAccountID(request);
  if (request.auth.credentials.role === 'reseller') {
    if(permissionCheck.getResellerAccs()) {
      accountIds = _.map(permissionCheck.getResellerAccs(), function (list) {
        return list.id;
      });
      accountIds.push(utils.getAccountID(request)[0]);
    }
  }

  if (accountIds.toString().includes(request.auth.credentials.account_id) === false) {
    accountIds.push(request.auth.credentials.account_id);
  }

  var options = {};
  if (!!filters_ && filters_.account_id) {
    if (!permissionCheck.checkPermissionsToResource(request, {id: filters_.account_id}, 'accounts')) {
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
    if (listOfGroups.length === 0) {
      return renderJSON(request, reply, null, listOfGroups);
    }
    listOfGroups = _.filter(listOfGroups, function (itemGroup) {
      if (!permissionCheck.checkPermissionsToResource(request, itemGroup, 'groups')) {
        return false;
      }
      return true;
    });
    listOfGroups = publicRecordFields.handle(listOfGroups, 'groups');

    return renderJSON(request, reply, null, listOfGroups);
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
  if (!permissionCheck.checkPermissionsToResource(request, newGroup, 'groups')) {
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
      newGroup.updated_by = request.auth.credentials.email;
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
 * @name getGroupUsers
 * @description
 *   Get a single groups list of users/APIkeys
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.getGroupUsers = function (request, reply) {
  var id = request.params.group_id;
  var userList = [];
  groups.getById(id).then(function (group) {
    users.list({group_id: group.id}, function (err, users) {
      userList = userList.concat(users);
      APIkeys.model.find({group_id: { $in: [group.id] }}, function (error, keys) {
        userList = userList.concat(keys);
        var result = {
          count: userList.length,
          users: userList
        };
        var res = publicRecordFields.handle(result, 'groupUsers');
        renderJSON(request, reply, null, res);
      });
    });
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
      updateGroupData.updated_by = request.auth.credentials.email || null;
      if (updateGroupData.permissions && updateGroupData.permissions.domains.access) {
        updateGroupData.permissions.waf_rules = true;
        updateGroupData.permissions.ssl_certs = true;
      }
    
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
    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'groups')) {
      return reply(boom.badRequest('Group not found'));
    }

    // get users by group id, check if our group has users in it before we delete it
    users.list({ group_id: id }, function (err, userList) {
      if (err) {
        return reply(boom.badImplementation(err));
      }

      if (userList && userList.length > 0) {
        var returnUsers = [];
        userList.forEach(function (user) {
          returnUsers.push({
            id: user.user_id,
            email: user.email
          });
        });
        var statusResponse;
        statusResponse = {
          statusCode: 400,
          message: 'Cannot delete a group with users',
          data: JSON.stringify(returnUsers)
        };

        return reply(boom.badRequest(statusResponse.message, statusResponse.data));
      }

      if (!err && (!userList || userList.length === 0)) {
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

          return renderJSON(request, reply, null, statusResponse);
        }).catch(function (err) {
          return reply(boom.badRequest(err));
        });
      } else {
        return reply(boom.badRequest('Something went wrong!'));
      }      
    });
  }).catch(function (err) {
    return reply(boom.badRequest(err));
  });
};