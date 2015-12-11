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

var mongoose           = require('mongoose');
var boom               = require('boom');
var config             = require('config');
var cds_request        = require('request');
var renderJSON         = require('../lib/renderJSON');
var AuditLogger        = require('revsw-audit');
var publicRecordFields = require('../lib/publicRecordFields');
var mongoConnection    = require('../lib/mongoConnections');
var App                = require('../models/App');
var apps               = new App(mongoose, mongoConnection.getConnectionPortal());

function permissionAllowed(request, app) {
  var result = true;
  if (request.auth.credentials.role !== 'revadmin' &&  request.auth.credentials.companyId.indexOf(app.account_id) === -1) {
    result = false;
  }
  return result;
}

exports.getApps = function(request, reply) {
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps', headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get list of mobile apps from the CDS'));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else if (res.statusCode === 200) {
      var listOfApps = [];
      if (response_json && response_json.length) {
        listOfApps = response_json.filter(function(app) {
          return permissionAllowed(request, app);
        });
      }
      renderJSON(request, reply, err, listOfApps);
    } else {
      return reply(boom.create(res.statusCode, res.message));
    }
  });
};

exports.getApp = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  var version = (request.query.version) ? '?version=' + request.query.version : '';
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionAllowed(request, existing_app)) {
      return reply(boom.badRequest('App ID not found'));
    }
    cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps/' + app_id + version, headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get the mobile app from the CDS for App ID ' + app_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message));
      } else if (res.statusCode === 200) {
        response_json = publicRecordFields.handle(response_json, 'apps');
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.getAppVersions = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionAllowed(request, existing_app)) {
      return reply(boom.badRequest('App ID not found'));
    }
    cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps/' + app_id + '/versions', headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get a list of configuration versions for mobile app from the CDS for App ID ' + app_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message));
      } else if (res.statusCode === 200) {
        response_json = publicRecordFields.handle(response_json, 'apps');
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.getAppConfigStatus = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionAllowed(request, existing_app)) {
      return reply(boom.badRequest('App ID not found'));
    }
    cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps/' + app_id + '/config_status', headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get configuration status of a mobile app from the CDS for App ID ' + app_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message));
      } else if (res.statusCode === 200) {
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.addApp = function(request, reply) {
  var newApp = request.payload;
  if (request.auth.credentials.companyId.indexOf(newApp.account_id) === -1) {
    return reply(boom.badRequest('Account ID not found'));
  }
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  apps.get({app_name: newApp.app_name, app_platform: newApp.app_platform, deleted: {$ne: true}}, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app name ' + newApp.app_name));
    }
    if (result) {
      return reply(boom.badRequest('The app name and platform is already registered in the system'));
    }
    cds_request({method: 'POST', url: config.get('cds_url') + '/v1/apps', body: JSON.stringify(newApp), headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('CDS failed to create a new mobile app'));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message));
      } else if (res.statusCode === 200) {
        newApp.id = response_json.id;
        AuditLogger.store({
          ip_address      : request.info.remoteAddress,
          datetime        : Date.now(),
          user_id         : request.auth.credentials.user_id,
          user_name       : request.auth.credentials.email,
          user_type       : 'user',
          account_id      : request.auth.credentials.companyId,
          activity_type   : 'add',
          activity_target : 'app',
          target_id       : response_json.id,
          target_name     : newApp.app_name,
          target_object   : newApp,
          operation_status: 'success'
        });
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.updateApp = function(request, reply) {
  var app_id = request.params.app_id;
  var updatedApp = request.payload;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  var optionsFlag = (request.query.options) ? '?options=' + request.query.options : '';
  var action = (optionsFlag === '?options=publish') ? 'publish' : 'modify';
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionAllowed(request, existing_app)) {
      return reply(boom.badRequest('App ID not found'));
    }
    cds_request({method: 'PUT', url: config.get('cds_url') + '/v1/apps/' + app_id + optionsFlag, body: JSON.stringify(updatedApp), headers: authHeader},
      function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('CDS failed to update the mobile app with App ID ' + app_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message));
      } else if (res.statusCode === 200) {
        updatedApp.id = app_id;
        AuditLogger.store({
          ip_address      : request.info.remoteAddress,
          datetime        : Date.now(),
          user_id         : request.auth.credentials.user_id,
          user_name       : request.auth.credentials.email,
          user_type       : 'user',
          account_id      : request.auth.credentials.companyId,
          activity_type   : action,
          activity_target : 'app',
          target_id       : response_json.id,
          target_name     : updatedApp.app_name,
          target_object   : updatedApp,
          operation_status: 'success'
        });
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.deleteApp = function(request, reply) {
  var app_id = request.params.app_id;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionAllowed(request, existing_app)) {
      return reply(boom.badRequest('App ID not found'));
    }
    cds_request({method: 'DELETE', url: config.get('cds_url') + '/v1/apps/' + app_id, headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('CDS failed to delete the mobile app with App ID ' + app_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message));
      } else if (res.statusCode === 200) {
        existing_app = publicRecordFields.handle(existing_app, 'apps');
        AuditLogger.store({
          ip_address      : request.info.remoteAddress,
          datetime        : Date.now(),
          user_id         : request.auth.credentials.user_id,
          user_name       : request.auth.credentials.email,
          user_type       : 'user',
          account_id      : request.auth.credentials.companyId,
          activity_type   : 'delete',
          activity_target : 'app',
          target_id       : response_json.id,
          target_name     : existing_app.app_name,
          target_object   : existing_app,
          operation_status: 'success'
        });
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.getSDKReleasedVersions = function(request, reply) {
  var response = {
    iOS: config.get('available_sdk_release_versions.iOS'),
    Android: config.get('available_sdk_release_versions.Android')
  };
  renderJSON(request, reply, null, response);
};
