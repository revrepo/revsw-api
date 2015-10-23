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
var boom = require('boom');
var AuditLogger = require('revsw-audit');
var uuid = require('node-uuid');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');

var ApiKey = require('../models/APIKey');
var User = require('../models/User');
var Account = require('../models/Account');

var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

exports.getApiKeys = function(request, reply) {
  apiKeys.list(request, function (error, listOfApiKeys) {
    renderJSON(request, reply, error, listOfApiKeys);
  });
};

exports.createApiKey = function(request, reply) {
  var newApiKey = request.payload;
  newApiKey.createdBy = request.auth.credentials.email;
  newApiKey.key = uuid();

  accounts.get({
    _id: newApiKey.companyId
  }, function (error, result) {
    if (error || !result) {
      return reply(boom.badRequest('Wrong company ID'));
    }

    apiKeys.get({
      key: newApiKey.key
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to verify the new API key'));
      }
      if (result) {
        return reply(boom.badRequest('The API key is already registered in the system'));
      }

      apiKeys.add(newApiKey, function (error, result) {
        if (error || !result) {
          return reply(boom.badImplementation('Failed to add new API key'));
        }

        var statusResponse;
        if (result) {
          statusResponse = {
            statusCode: 200,
            message   : 'Successfully created new API key',
            key       : result.key
          };

          AuditLogger.store({
            ip_adress       : request.info.remoteAddress,
            datetime        : Date.now(),
            user_id         : request.auth.credentials.user_id,
            user_name       : request.auth.credentials.email,
            user_type       : 'user',
            account_id      : request.auth.credentials.companyId,
            domain_id       : request.auth.credentials.domain,
            activity_type   : 'add',
            activity_target : 'account',
            target_id       : result._id + '',
            target_name     : result.key,
            target_object   : result,
            operation_status: 'success'
          });
          renderJSON(request, reply, error, statusResponse);
        }
      });
    });
  });
};

exports.updateApiKey = function (request, reply) {
  var updatedApiKey = request.payload;
  updatedApiKey.key = request.params.key;

  apiKeys.get({
    key: updatedApiKey.key
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify the API key'));
    }
    apiKeys.update(updatedApiKey, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the API key'));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully updated the API key',
      };

      AuditLogger.store({
        ip_adress        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        domain_id        : request.auth.credentials.domain,
        activity_type    : 'modify',
        activity_target  : 'account',
        target_id        : result.id + '',
        target_name      : result.key,
        target_object    : result,
        operation_status : 'success'
      });
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.activateApiKey = function (request, reply) {
  apiKeys.get({
    key: request.params.key
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify the API key'));
    }
    apiKeys.activate({key: result.key}, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to activate the API key'));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully activated the API key',
      };

      AuditLogger.store({
        ip_adress        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        domain_id        : request.auth.credentials.domain,
        activity_type    : 'activate',
        activity_target  : 'account',
        target_id        : result.id + '',
        target_name      : result.key,
        target_object    : result,
        operation_status : 'success'
      });
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deactivateApiKey = function (request, reply) {
  apiKeys.get({
    key: request.params.key
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify the API key'));
    }
    apiKeys.deactivate({key: result.key}, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to deactivate the API key'));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully deactivated the API key',
      };

      AuditLogger.store({
        ip_adress        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        domain_id        : request.auth.credentials.domain,
        activity_type    : 'deactivate',
        activity_target  : 'account',
        target_id        : result._id + '',
        target_name      : result.key,
        target_object    : result,
        operation_status : 'success'
      });
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteApiKey = function (request, reply) {
  var key = request.params.key;
  apiKeys.get({
    key: key
  }, function (error, result) {
    if (error || !key) {
      return reply(boom.badRequest('API key not found'));
    }
    apiKeys.remove({
      key: key
    }, function (error) {
      if (error) {
        return reply(boom.badRequest('API key not found'));
      }
      var statusResponse;
      statusResponse = {
        statusCode : 200,
        message    : 'Successfully deleted the API key'
      };

      AuditLogger.store({
        ip_adress        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        domain_id        : request.auth.credentials.domain,
        activity_type    : 'delete',
        activity_target  : 'account',
        target_id        : result._id + '',
        target_name      : result.key,
        target_object    : result,
        operation_status : 'success'
      });
      renderJSON(request, reply, error, statusResponse);
    });
  });
};
