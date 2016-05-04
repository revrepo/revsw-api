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

var mongoose    = require('mongoose');
var boom        = require('boom');
var AuditLogger = require('../lib/audit');
var config      = require('config');
var cds_request = require('request');
var utils           = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
var _ = require('lodash');

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var DomainConfig   = require('../models/DomainConfig');
var Account = require('../models/Account');
var LogShippingJob = require('../models/LogShippingJob');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var logShippingJobs = new LogShippingJob(mongoose, mongoConnection.getConnectionPortal());

exports.getLogShippingJobStatus = function(request, reply) {

  var logJobId = request.params.log_job_id;

  logShippingJobs.get(logJobId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for log shipping job ID ' + logJobId));
    }

    if (!result || !utils.checkUserAccessPermissionToLogShippingJob(request,result)) {
      return reply(boom.badRequest('Log shipping job ID not found'));
    }

    var response = {
      general_job_status: result.operational_mode,
      log_lines_shipped_for_last_24_hours: 121,
      log_lines_to_ship: 1232,
      files_shipped_for_last_24_hours: 234234,
      files_to_ship: 24,
      failures_for_last_24_hours: 35
    };

    renderJSON(request, reply, error, response);
  });
};


exports.listLogShippingJobs = function(request, reply) {
  logShippingJobs.list(function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve from the DB a list of log shipping jobs'));
    }

    var response = [];
    for (var i=0; i < result.length; i++) {
      if (utils.checkUserAccessPermissionToLogShippingJob(request,result[i])) {
        response.push(result[i]);
      }
    }
    var response2 = publicRecordFields.handle(response, 'logShippingJobs');
    renderJSON(request, reply, error, response2);
  });
};

exports.getLogShippingJob = function(request, reply) {

  var logJobId = request.params.log_job_id;

  logShippingJobs.get(logJobId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for log shipping job ID ' + logJobId));
    }
    if (!result || !utils.checkUserAccessPermissionToLogShippingJob(request,result)) {
      return reply(boom.badRequest('Log job ID not found'));
    }

    var response = publicRecordFields.handle(result, 'logShippingJob');
    renderJSON(request, reply, error, response);
  });
};

exports.createLogShippingJob = function(request, reply) {

  var newLogJob = request.payload;
  var logJobId = request.params.log_job_id;

  if (!utils.checkUserAccessPermissionToLogShippingJob(request,newLogJob)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  newLogJob.created_by = utils.generateCreatedByField(request);

  logShippingJobs.add(newLogJob, function (error, result) {
    if (error || !result) {
      return reply(boom.badImplementation('Failed to store in the DB new log shipping job ' + JSON.stringify(newLogJob)));
    }

    var result2 = publicRecordFields.handle(result, 'LogShippingJob');
    result2.destination_key = '<Hidden for security reasons>';
    result2.destination_password = '<Hidden for security reasons>';

    AuditLogger.store({
      account_id       : result.account_id,
      activity_type    : 'add',
      activity_target  : 'logshippingjob',
      target_id        : result.id,
      target_name      : result.job_name,
      target_object    : result2,
      operation_status : 'success'
    }, request);

    var statusResponse = {
      statusCode: 200,
      message: 'Successfully created a new log shipping job',
      object_id: result.id
    };

    renderJSON(request, reply, error, statusResponse);
  });
};

exports.updateLogShippingJob = function(request, reply) {

  var newLogJob = request.payload;
  var logJobId = request.params.log_job_id;
  newLogJob.id = logJobId;

  logShippingJobs.get(logJobId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for log shipping job ID ' + logJobId));
    }

    // TODO add a permissions check for new account_id
    if (!result || !utils.checkUserAccessPermissionToLogShippingJob(request,result)) {
      return reply(boom.badRequest('Log shipping job ID not found'));
    }

    newLogJob.updated_by = utils.generateCreatedByField(request);

    logShippingJobs.update(newLogJob, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the DB for log shipping job ID ' + logJobId));
      }

      var result2 = publicRecordFields.handle(result, 'LogShippingJob');
      result2.destination_key = '<Hidden for security reasons>';
      result2.destination_password = '<Hidden for security reasons>';

      AuditLogger.store({
        account_id       : result.account_id,
        activity_type    : 'modify',
        activity_target  : 'logshippingjob',
        target_id        : logJobId,
        target_name      : result.job_name,
        target_object    : result2,
        operation_status : 'success'
      }, request);

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the log shipping job'
      };

      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteLogShippingJob = function(request, reply) {

  var logJobId = request.params.log_job_id;

  logShippingJobs.get(logJobId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for log shipping job ID ' + logJobId));
    }
    
    if (!result || !utils.checkUserAccessPermissionToLogShippingJob(request,result)) {
      return reply(boom.badRequest('Log shipping job ID not found'));
    }
  
    logShippingJobs.remove({ _id: logJobId}, function (error, item) {
      if (error) {
        return reply(boom.badImplementation('Failed to delete from the DB log shipping job ID ' + logJobId));
      }

      var result2 = publicRecordFields.handle(result, 'LogShippingJob');
      result2.destination_key = '<Hidden for security reasons>';
      result2.destination_password = '<Hidden for security reasons>';

      AuditLogger.store({
        account_id       : result.account_id,
        activity_type    : 'delete',
        activity_target  : 'logshippingjob',
        target_id        : logJobId,
        target_name      : result.job_name,
        target_object    : result2,
        operation_status : 'success'
      }, request);

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the log shipping job'
      };

      renderJSON(request, reply, error, statusResponse);
    });
  });
};
