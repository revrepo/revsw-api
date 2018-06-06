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
var trafficAlerter = require('./../lib/trafficAlerter');

var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);
var permissionCheck = require('./../lib/requestPermissionScope');

var User = require('../models/User');
var APIKey = require('../models/APIKey');
var Account = require('../models/Account');
var DomainConfig = require('../models/DomainConfig');
var TrafficAlertConfig = require('./../models/TrafficAlertConfig');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var APIkeys = Promise.promisifyAll(new APIKey(mongoose, mongoConnection.getConnectionPortal()));
var trafficAlertsConfigs = Promise.promisifyAll(new TrafficAlertConfig(mongoose, mongoConnection.getConnectionPortal()));

/**
 * @name getTrafficAlerts
 * @description method get all TrafficAlerts
 */
exports.getTrafficAlerts = function getTrafficAlerts(request, reply) {
  var filters_ = request.query.filters;
  var accountIds = utils.getAccountID(request);
  if (request.auth.credentials.role === 'reseller') {
    if (permissionCheck.getResellerAccs()) {
      accountIds = _.map(permissionCheck.getResellerAccs(), function (list) {
        return list.id;
      });
      accountIds.push(utils.getAccountID(request)[0]);
    }
  }

  if (accountIds.toString().includes(request.auth.credentials.account_id) === false) {
    accountIds.push(request.auth.credentials.account_id);
  }

  var operation;
  if (filters_ && filters_.operation) {
    operation = filters_.operation;
  }

  var options = {};
  if (!!filters_ && filters_.account_id) {
    if (!permissionCheck.checkPermissionsToResource(request, { id: filters_.account_id }, 'accounts')) {
      return reply(boom.badRequest('Account ID not found'));
    }
    options.account_id = filters_.account_id;
  } else {
    // NOTE: set limit accounts if user is not RevAdmin
    if (!utils.isUserRevAdmin(request)) {
      options.account_id = accountIds;
    }
  }

  trafficAlertsConfigs.list(options).then(function (listOfTrafficAlerts) {
    if (listOfTrafficAlerts.length === 0) {
      return renderJSON(request, reply, null, listOfTrafficAlerts);
    }

    for (let i = 0; i < listOfTrafficAlerts.length; i++) {
      if (!listOfTrafficAlerts[i].notifications_list_id) {
        trafficAlertsConfigs.removeById(listOfTrafficAlerts[i].id);
      }
    }

    listOfTrafficAlerts = publicRecordFields.handle(listOfTrafficAlerts, 'trafficAlerts');

    return renderJSON(request, reply, null, listOfTrafficAlerts);
  }).catch(function (err) {
    return reply(boom.badRequest(err));
  });
};
/**
 * @name createTrafficAlert
 * @description
 *   Create new TrafficAlert
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.createTrafficAlert = function (request, reply) {
  var newTrafficAlert = request.payload;
  var _createdTrafficAlert;
  if ((newTrafficAlert.account_id === undefined || newTrafficAlert.account_id.length === 0) && utils.getAccountID(request).length !== 0) {
    newTrafficAlert.account_id = utils.getAccountID(request);
  }

  if (newTrafficAlert.account_id === undefined || newTrafficAlert.account_id.length === 0) {
    return reply(boom.badRequest('You have to specify account_id if your TrafficAlert does not have a valid account_id attribute'));
  }
  if (!permissionCheck.checkPermissionsToResource(request, { id: newTrafficAlert.account_id }, 'accounts')) {
    return reply(boom.badRequest('Your user does not manage the specified company ID(s)'));
  }


  var accountId = newTrafficAlert.account_id;

  var statusResponse;
  async.waterfall([
    function (cb) {
      newTrafficAlert.created_by = request.auth.credentials.email;
      newTrafficAlert.created_at = Date.now();
      newTrafficAlert.updated_at = Date.now();
      newTrafficAlert.updated_by = request.auth.credentials.email;
      trafficAlertsConfigs.add(newTrafficAlert).then(function (TrafficAlert) {
        _createdTrafficAlert = TrafficAlert;
        newTrafficAlert.config_id = TrafficAlert.id;
        trafficAlerter.createAlertRule(newTrafficAlert)
          .then(function (res) {
            cb(null);
          })
          .catch(function (err) {
            return reply(boom.badRequest(err));
          });

      }).catch(function (err) {
        return reply(boom.badRequest(err));
      });
    },
    function (cb) {
      AuditLogger.store({
        account_id: accountId,
        activity_type: 'add',
        activity_target: 'trafficAlert',
        target_id: _createdTrafficAlert.id,
        target_name: _createdTrafficAlert.name,
        target_object: _createdTrafficAlert,
        operation_status: 'success'
      }, request);
      cb();
    },
    function (cb) {
      if (!!_createdTrafficAlert) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully created new Traffic Alert',
          object_id: _createdTrafficAlert.id
        };
      }
      cb(null, statusResponse);
    }
  ], function (error, statusResponse) {
    renderJSON(request, reply, error, statusResponse);
  });
};

/**
 * @name getTrafficAlert
 * @description
 *   Get a single TrafficAlert
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.getTrafficAlert = function (request, reply) {

  var id = request.params.traffic_alert_id;
  var operation;
  if (request.query.filters && request.query.filters.operation) {
    operation = request.query.filters.operation;
  }
  trafficAlertsConfigs.getById(id).then(function (TrafficAlert) {
    var result = publicRecordFields.handle(TrafficAlert, 'trafficAlerts');
    return renderJSON(request, reply, null, result);
  }).catch(function (err) {
    return reply(boom.badRequest(err));
  });
};

/**
 * @name getTrafficAlertStatus
 * @description
 *   Get rule alert status
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.getTrafficAlertStatus = function (request, reply) {

  var id = request.params.traffic_alert_id;
  trafficAlerter.getAlertRuleStatus(id).then(function (res) {
    return reply({ status: res.body });
  })
    .catch(function (err) {
      return reply(boom.badRequest(err));
    });
};

/**
 * @name updateTrafficAlert
 * @description
 *   Updates a TrafficAlert
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.updateTrafficAlert = function (request, reply) {
  var updateTrafficAlertData = request.payload;
  var TrafficAlertAccountId = updateTrafficAlertData.account_id;
  var TrafficAlertId;
  var statusResponse;
  var resultTrafficAlertData;

  async.waterfall([
    function (cb) {
      if (Object.keys(updateTrafficAlertData).length === 0) {
        return cb('No attributes specified');
      }

      TrafficAlertId = request.params.traffic_alert_id;
      updateTrafficAlertData.id = TrafficAlertId;

      cb();
    },
    function (cb) {
      updateTrafficAlertData.updated_at = Date.now();
      updateTrafficAlertData.updated_by = request.auth.credentials.email || request.auth.credentials.key;
      if (updateTrafficAlertData.permissions && updateTrafficAlertData.permissions.domains.access) {
        updateTrafficAlertData.permissions.waf_rules = true;
        updateTrafficAlertData.permissions.ssl_certs = true;
      }

      trafficAlertsConfigs.update(updateTrafficAlertData).then(function (result) {
        resultTrafficAlertData = publicRecordFields.handle(result, 'trafficAlerts');
        cb();
      }).catch(function (err) {
        return reply(boom.badRequest(err));
      });

    },
    function (cb) {
      AuditLogger.store({
        account_id: TrafficAlertAccountId,
        activity_type: 'modify',
        activity_target: 'trafficAlert',
        target_id: resultTrafficAlertData.id,
        target_name: resultTrafficAlertData.name,
        target_object: resultTrafficAlertData,
        operation_status: 'success'
      }, request);
      cb();
    },
    function (cb) {
      if (!!resultTrafficAlertData) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully updated the TrafficAlert'
        };
      }
      cb(null, statusResponse);
    }
  ], function (error, statusResponse) {
    renderJSON(request, reply, error, statusResponse);
  });
};

/**
 * @name deleteTrafficAlert
 * @description
 *   Delete a TrafficAlert
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.deleteTrafficAlert = function (request, reply) {
  var id = request.params.traffic_alert_id;
  var delTrafficAlert;

  trafficAlertsConfigs.getById(id).then(function (res) {
    delTrafficAlert = res;
    trafficAlertsConfigs.removeById(id).then(function (result) {
      var statusResponse;
      statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the TrafficAlert'
      };

      AuditLogger.store({
        account_id: request.auth.credentials.account_id,
        activity_type: 'delete',
        activity_target: 'trafficAlert',
        target_id: delTrafficAlert.id,
        target_name: delTrafficAlert.name,
        target_object: delTrafficAlert,
        operation_status: 'success'
      }, request);

      return renderJSON(request, reply, null, statusResponse);
    }).catch(function (err) {
      return reply(boom.badRequest(err));
    });
  })
    .catch(function (err) {
      return reply(boom.badRequest(err));
    });

};