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
var publicRecordFields = require('../lib/publicRecordFields');

var ApiKey = require('../models/APIKey');
var User = require('../models/User');
var Account = require('../models/Account');

var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

exports.getApiKeys = function(request, reply) {
  apiKeys.list(request, function (error, listOfApiKeys) {
    listOfApiKeys = publicRecordFields.handle(listOfApiKeys, 'apiKeys');
    renderJSON(request, reply, error, listOfApiKeys);
  });
};

exports.getApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get( { _id: id }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get API key ' + id));
    }

    if (result) {
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('API key not found'));
    }
  });
};

exports.createApiKey = function(request, reply) {
  var newApiKey = request.payload;
  newApiKey.created_by = request.auth.credentials.email;
  newApiKey.key = uuid();
  newApiKey.key_name = 'New API Key';

  if ( request.auth.credentials.companyId.indexOf(newApiKey.account_id) === -1 ) {
      return reply(boom.badRequest('Company ID not found'));
  }

  accounts.get({
    _id: newApiKey.account_id
  }, function (error, result) {
    if (error || !result) {
      return reply(boom.badRequest('Wrong company ID'));
    }

    apiKeys.get({
      key: newApiKey.key
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to verify new API key ' + newApiKey.key));
      }
      if (result) {
        return reply(boom.badRequest('The API key is already registered in the system'));
      }

      apiKeys.add(newApiKey, function (error, result) {
        if (error || !result) {
          return reply(boom.badImplementation('Failed to add new API key ' + newApiKey.key ));
        }

        var statusResponse;


        result = publicRecordFields.handle(result, 'apiKeys');

        if (result) {
          statusResponse = {
            statusCode: 200,
            message   : 'Successfully created new API key',
            key       : result.key,
            object_id : result._id.toString()
          };

          AuditLogger.store({
            ip_address      : request.info.remoteAddress,
            datetime        : Date.now(),
            user_id         : request.auth.credentials.user_id,
            user_name       : request.auth.credentials.email,
            user_type       : 'user',
            account_id      : request.auth.credentials.companyId,
            activity_type   : 'add',
            activity_target : 'apikey',
            target_id       : result._id + '',
            target_name     : result.key_name,
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
  var id = request.params.key_id;

  if ( updatedApiKey.account_id && request.auth.credentials.companyId.indexOf(updatedApiKey.account_id) === -1 ) {
      return reply(boom.badRequest('Company ID not found'));
  }

  apiKeys.get( { _id: id }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify API key ' + id));
    }

    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    updatedApiKey.key = result.key;
    apiKeys.update(updatedApiKey, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update API key ' + id));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully updated the API key',
      };

      result = publicRecordFields.handle(result, 'apiKeys');

      AuditLogger.store({
        ip_address       : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        activity_type    : 'modify',
        activity_target  : 'apikey',
        target_id        : result.id + '',
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      });

      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.activateApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get( { _id: id }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify API key ' + id));
    }

    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    if ( request.auth.credentials.companyId.indexOf(result.account_id) === -1 ) {
      return reply(boom.badRequest('API key not found'));
    }

    apiKeys.activate({key: result.key}, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to activate API key ' + id));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully activated the API key',
      };

      result = publicRecordFields.handle(result, 'apiKeys');

      AuditLogger.store({
        ip_address        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        activity_type    : 'modify',
        activity_target  : 'apikey',
        target_id        : result.id + '',
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      });
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deactivateApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get( { _id: id }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify the API key'));
    }

    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    if ( request.auth.credentials.companyId.indexOf(result.account_id) === -1 ) {
      return reply(boom.badRequest('API key not found'));
    }

    apiKeys.deactivate({key: result.key}, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to deactivate API key ' + id));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully deactivated the API key'
      };

      result = publicRecordFields.handle(result, 'apiKeys');

      AuditLogger.store({
        ip_address        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        activity_type    : 'modify',
        activity_target  : 'apikey',
        target_id        : result.id + '',
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      });
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get( { _id: id }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Error retrieving API key ' + id));
    }
    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    if ( request.auth.credentials.companyId.indexOf(result.account_id) === -1 ) {
      return reply(boom.badRequest('API key not found'));
    }

    apiKeys.remove( { _id: id }, function (error) {
      if (error) {
        return reply(boom.badImplementation('Error removing the key'));
      }

      var statusResponse;
      statusResponse = {
        statusCode : 200,
        message    : 'Successfully deleted the API key'
      };

      result = publicRecordFields.handle(result, 'apiKeys');

      AuditLogger.store({
        ip_address       : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        activity_type    : 'delete',
        activity_target  : 'apikey',
        target_id        : result._id + '',
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      });

      renderJSON(request, reply, error, statusResponse);
    });
  });
};
