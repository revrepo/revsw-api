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
var AuditLogger        = require('../lib/audit');
var publicRecordFields = require('../lib/publicRecordFields');
var mongoConnection    = require('../lib/mongoConnections');
var App                = require('../models/App');
var apps               = new App(mongoose, mongoConnection.getConnectionPortal());
var logger             = require('revsw-logger')(config.log_config);
var utils              = require('../lib/utilities.js');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
var _ = require('lodash');

var permissionCheck = require('./../lib/requestPermissionScope');

exports.getApps = function(request, reply) {
  var filters_ = request.query.filters;
  var operation = 'mobile_apps';
  if (filters_ && filters_.operation) {
    operation = filters_.operation;
  }
  logger.info('Calling CDS to get a list of registered apps');
  cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps', headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get list of mobile apps from the CDS', err));
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
          return permissionCheck.checkPermissionsToResource(request, app, operation);
        });
      }
      // TODO: ??? make refactoring - send filter then call CDS
      if(!!filters_ && !!filters_.account_id){
          listOfApps = _.filter(listOfApps,function(item){
            return item.account_id === filters_.account_id;
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
  var version = (request.query.version) ? '?version=' + request.query.version : '';
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, existing_app, 'mobile_apps')) {
      return reply(boom.badRequest('App ID not found'));
    }
    logger.info('Calling CDS to get details for app ID ' + app_id);
    cds_request({method: 'GET', url: config.get('cds_url') + '/v1/apps/' + app_id + version, headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get the mobile app from the CDS for App ID ' + app_id));
      }
      var response_json = JSON.parse(body);
      // TODO: Need to move the CDS status verification code to a separate function (instead of repeating it in many handlers)
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
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, existing_app, 'mobile_apps')) {
      return reply(boom.badRequest('App ID not found'));
    }
    logger.info('Calling CDS to get a list of configuration versions for app ID ' + app_id);
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
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.getAppConfigStatus = function(request, reply) {
  var app_id = request.params.app_id;
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, existing_app, 'mobile_apps')) {
      return reply(boom.badRequest('App ID not found'));
    }
    logger.info('Calling CDS to get configuration status for app ID: ' + app_id);
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
  if (!permissionCheck.checkPermissionsToResource(request, newApp, 'mobile_apps')) {
    return reply(boom.badRequest('Account ID not found'));
  }
  // NOTE: Can be the same app_name for different platforms, but uniqueness for account_id
  apps.get({app_name: newApp.app_name, app_platform: newApp.app_platform, account_id:newApp.account_id, deleted: {$ne: true}}, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app name ' + newApp.app_name));
    }
    if (result) {
      return reply(boom.badRequest('The app name and platform is already registered in the system'));
    }

    newApp.created_by = utils.generateCreatedByField(request);
    logger.info('Calling CDS to create a new app: ' + JSON.stringify(newApp));
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
          account_id      : newApp.account_id,
          activity_type   : 'add',
          activity_target : 'app',
          target_id       : response_json.id,
          target_name     : newApp.app_name,
          target_object   : newApp,
          operation_status: 'success'
        }, request);
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
  var optionsFlag = (request.query.options) ? '?options=' + request.query.options : '';
  var action = (optionsFlag === '?options=publish') ? 'publish' : 'modify';
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, existing_app, 'mobile_apps')) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, {id: updatedApp.account_id}, 'accounts')) {
      return reply(boom.badRequest('Account ID not found'));
    }
    updatedApp.updated_by =  utils.generateCreatedByField(request);
    logger.info('Calling CDS to update app ID ' + app_id + ' with new configuration: ' + JSON.stringify(updatedApp));
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
          account_id      : existing_app.account_id,
          activity_type   : action,
          activity_target : 'app',
          target_id       : app_id,
          target_name     : updatedApp.app_name,
          target_object   : updatedApp,
          operation_status: 'success'
        }, request);
        renderJSON(request, reply, err, response_json);
      } else {
        return reply(boom.create(res.statusCode, res.message));
      }
    });
  });
};

exports.deleteApp = function(request, reply) {
  var app_id = request.params.app_id;
  var _deleted_by = utils.generateCreatedByField(request);
  var options = '?deleted_by='+_deleted_by;
  var account_id;
  apps.get({_id: app_id, deleted: {$ne: true}}, function (error, existing_app) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve app details for app ID ' + app_id, error));
    }
    if (!existing_app) {
      return reply(boom.badRequest('App ID not found'));
    }
    if (!permissionCheck.checkPermissionsToResource(request, existing_app, 'mobile_apps')) {
      return reply(boom.badRequest('App ID not found'));
    }
    account_id = existing_app.account_id;

    logger.info('Calling CDS to delete app ID ' + app_id + ' and option deleted_by '+ _deleted_by );
    cds_request({method: 'DELETE', url: config.get('cds_url') + '/v1/apps/' + app_id + options, headers: authHeader}, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('CDS failed to delete the mobile app with App ID ' + app_id, err));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation(response_json.message, res));
      } else if (res.statusCode === 200) {
        existing_app = publicRecordFields.handle(existing_app, 'apps');
        AuditLogger.store({
          account_id      : account_id,
          activity_type   : 'delete',
          activity_target : 'app',
          target_id       : app_id,
          target_name     : existing_app.app_name,
          target_object   : existing_app,
          operation_status: 'success'
        }, request);
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
    Android: config.get('available_sdk_release_versions.Android'),
    Windows_Mobile: config.get('available_sdk_release_versions.Windows_Mobile')
  };
  renderJSON(request, reply, null, response);
};
