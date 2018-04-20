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
var AuditLogger = require('../lib/audit');
var uuid = require('node-uuid');
var _ = require('lodash');
var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var ApiKey = require('../models/APIKey');
var User = require('../models/User');
var Account = require('../models/Account');
var DomainConfig = require('../models/DomainConfig');
var utils = require('../lib/utilities.js');

var apiKeys = new ApiKey(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var permissionCheck = require('./../lib/requestPermissionScope');

function verifyDomainOwnership(companyId, domainList, callback) {

  var verified = true;
  var okDomains = [];
  var wrongDomains = [];
  var j = 0;

  function checkDomain(_i, l) {
    domainConfigs.get(domainList[_i], function(error, result) {
      j++;

      // TODO: Need to use a centralized domain permissions check function from "utils" module
      if (!error && result) {
        if (!result.account_id || result.account_id !== companyId) {
          wrongDomains.push(domainList[_i]);
        } else {
          okDomains.push(domainList[_i]);
        }
      } else {
        wrongDomains.push(domainList[_i]);
      }
      if (j === l) {
        callback(error, okDomains, wrongDomains);
      }
    });
  }

  if (!domainList || !domainList.length) {
    callback(null, okDomains, wrongDomains);
  } else {
    for (var i = 0, l = domainList.length; i < l; i++) {
      checkDomain(i, l);
    }
  }
}

exports.getApiKeys = function(request, reply) {
  // TODO: Need to move the access check function from ".list" to this function


  if (permissionCheck.getResellerAccs()) {
    request.account_list = _.map(permissionCheck.getResellerAccs(), function (acc) {
      return acc.id;
    });
    apiKeys.list(request, function (error, listOfApiKeys) {
      listOfApiKeys = publicRecordFields.handle(listOfApiKeys, 'apiKeys');
      if (!permissionCheck.checkSimplePermissions(request, 'API_keys')) {
        listOfApiKeys = [];
      }
      listOfApiKeys = _.filter(listOfApiKeys, function (key) {
        return permissionCheck.checkPermissionsToResource(request, { id: key.account_id }, 'accounts');
      });
      renderJSON(request, reply, error, listOfApiKeys);
    });
  } else {
    apiKeys.list(request, function (error, listOfApiKeys) {
      listOfApiKeys = publicRecordFields.handle(listOfApiKeys, 'apiKeys');
      listOfApiKeys = _.filter(listOfApiKeys, function (key) {
        return permissionCheck.checkPermissionsToResource(request, { id: key.account_id }, 'accounts');
      });
      renderJSON(request, reply, error, listOfApiKeys);
    });
  }
};

exports.getApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get API key ID ' + id));
    }

    if (result && permissionCheck.checkPermissionsToResource(request, result, 'API_keys')) {

      result = publicRecordFields.handle(result, 'apiKeys');
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('API key not found'));
    }
  });
};

exports.getMyApiKey = function(request, reply) {
  if (request.auth.credentials.user_type === 'apikey') {
    var apiKeyId = request.auth.credentials.id;
    apiKeys.get({
      _id: apiKeyId
    }, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve details for API key ' + apiKeyId));
      }
      if (result) {
        result = publicRecordFields.handle(result, 'apiKeys');

        renderJSON(request, reply, error, result);
      } else {
        return reply(boom.badRequest('API Key not found'));
      }
    });
  } else {
    return reply(boom.badRequest('Non-API Key authorization'));
  }
};

exports.createApiKey = function(request, reply) {
  var newApiKey = request.payload;
  newApiKey.created_by = utils.generateCreatedByField(request);
  var newKey = uuid();
  newApiKey.key = newKey;
  newApiKey.key_name = 'New API Key';
  newApiKey.role = request.payload.role || 'admin';

  if (!permissionCheck.checkSimplePermissions(request, 'API_keys')) {
    return reply(boom.forbidden('You are not authorized to create a new API Key'));
  }

  if (newApiKey.managed_account_ids && newApiKey.managed_account_ids.length > 0) {
    if (!newApiKey.permissions) {
      newApiKey.permissions = permissionCheck.permissionObject;
    }
    newApiKey.permissions.accounts.list = newApiKey.managed_account_ids;
    newApiKey.permissions.accounts.access = true;
    newApiKey.permissions.accounts.allow_list = true;
  }

  if (!newApiKey.account_id || !permissionCheck.checkPermissionsToResource(request, {id: newApiKey.account_id}, 'accounts')) {
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
        return reply(boom.badImplementation('Failed to verify new API key ' + newKey));
      }
      if (result) {
        return reply(boom.badRequest('The API key is already registered in the system'));
      }

      apiKeys.add(newApiKey, function (error, result) {
        if (error || !result) {
          return reply(boom.badImplementation('Failed to add new API key ' + newKey));
        }

        var statusResponse;

        result = publicRecordFields.handle(result, 'apiKeys');

        if (result) {
          statusResponse = {
            statusCode: 200,
            message   : 'Successfully created new API key',
            key       : newKey,
            object_id : result.id
          };

          AuditLogger.store({
            account_id      : newApiKey.account_id,
            activity_type   : 'add',
            activity_target : 'apikey',
            target_id       : result.id,
            target_name     : result.key_name,
            target_object   : result,
            operation_status: 'success'
          }, request);

          renderJSON(request, reply, error, statusResponse);
        }
      });
    });
  });
};

exports.updateApiKey = function (request, reply) {
  var updatedApiKey = request.payload;
  var id = request.params.key_id;
  if (updatedApiKey.permissions && updatedApiKey.permissions.domains.access) {
    updatedApiKey.permissions.waf_rules = true;
    updatedApiKey.permissions.ssl_certs = true;
  }

  if (updatedApiKey.managed_account_ids && updatedApiKey.managed_account_ids.length > 0) {
    if (!updatedApiKey.permissions) {
      updatedApiKey.permissions = permissionCheck.permissionObject;
    }
    updatedApiKey.permissions.accounts.list = updatedApiKey.managed_account_ids;
    updatedApiKey.permissions.accounts.access = true;
    updatedApiKey.permissions.accounts.allow_list = true;
  } else {
    if (!updatedApiKey.permissions) {
      updatedApiKey.permissions = permissionCheck.permissionObject;
    }
    updatedApiKey.permissions.accounts.list = null;
    updatedApiKey.permissions.accounts.access = true;
    updatedApiKey.permissions.accounts.allow_list = true;
  }

  function doUpdate() {
    apiKeys.update(updatedApiKey, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update API key ID ' + id));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully updated the API key'
      };

      result = publicRecordFields.handle(result, 'apiKeys');

      AuditLogger.store({
        account_id       : updatedApiKey.account_id,
        activity_type    : 'modify',
        activity_target  : 'apikey',
        target_id        : result.id,
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      }, request);

      renderJSON(request, reply, error, statusResponse);
    });
  }

  if (!updatedApiKey.account_id || !permissionCheck.checkPermissionsToResource(request, updatedApiKey, 'API_keys')) {
      return reply(boom.badRequest('Company ID not found'));
  }

  apiKeys.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify API key ' + id));
    }

    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    updatedApiKey.key = result.key;

    if (updatedApiKey.domains) {
      verifyDomainOwnership(updatedApiKey.account_id, updatedApiKey.domains, function(error, okDomains, wrongDomains) {
        if (error) {
          return reply(boom.badImplementation('Error retrieving domain information'));
        }

        if (wrongDomains.length) {
          return reply(boom.badRequest('Wrong domains: ' + wrongDomains));
        }

        doUpdate();

      });
    } else {
      doUpdate();
    }
  });
};

exports.activateApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify API key ' + id));
    }

    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    if (!result.account_id || !permissionCheck.checkPermissionsToResource(request, result, 'API_keys')) {
      return reply(boom.badRequest('API key not found'));
    }

    apiKeys.activate({key: result.key}, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to activate API key ' + id));
      }

      var statusResponse = {
        statusCode: 200,
        message   : 'Successfully activated the API key'
      };

      result = publicRecordFields.handle(result, 'apiKeys');

      AuditLogger.store({
        account_id       : result.account_id,
        activity_type    : 'modify',
        activity_target  : 'apikey',
        target_id        : result.id,
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      }, request);
      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deactivateApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify the API key'));
    }

    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    // TODO: use a function
    if (request.auth.credentials.role !== 'revadmin' && utils.getAccountID(request).indexOf(result.account_id) === -1) {
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
        account_id       : result.account_id,
        activity_type    : 'modify',
        activity_target  : 'apikey',
        target_id        : result.id,
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      }, request);

      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteApiKey = function (request, reply) {
  var id = request.params.key_id;
  apiKeys.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Error retrieving API key ' + id));
    }
    if (!result) {
      return reply(boom.badRequest('API key not found'));
    }

    if (!result.account_id || !permissionCheck.checkPermissionsToResource(request, result, 'API_keys')) {
      return reply(boom.badRequest('API key not found'));
    }

    apiKeys.remove({_id: id}, function (error) {
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
        account_id       : result.account_id,
        activity_type    : 'delete',
        activity_target  : 'apikey',
        target_id        : result.id,
        target_name      : result.key_name,
        target_object    : result,
        operation_status : 'success'
      }, request);

      renderJSON(request, reply, error, statusResponse);
    });
  });
};
