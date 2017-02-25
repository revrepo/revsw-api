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

var DomainConfig = require('../models/DomainConfig');
var Account = require('../models/Account');
var LogShippingJob = require('../models/LogShippingJob');
var App = require('../models/App');

var apps = Promise.promisifyAll(new App(mongoose, mongoConnection.getConnectionPortal()));
var domainConfigs  = Promise.promisifyAll(new DomainConfig(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var logShippingJobs = Promise.promisifyAll(new LogShippingJob(mongoose, mongoConnection.getConnectionPortal()));

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
  var filters_ = request.query.filters;
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
    // TODO: ??? make refactoring - apply filter like option in logShippingJobs.list ???
    if(!!filters_ && !!filters_.account_id){
      response = _.filter(response,function(item){
        return item.account_id === filters_.account_id;
      });
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
      return reply(boom.badRequest('Log shipping job ID not found'));
    }

    var response = publicRecordFields.handle(result, 'logShippingJob');
    renderJSON(request, reply, error, response);
  });
};

exports.createLogShippingJob = function(request, reply) {
  var newLogJob = request.payload;

  if (!utils.checkUserAccessPermissionToLogShippingJob(request, newLogJob)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  newLogJob.created_by = utils.generateCreatedByField(request);

  logShippingJobs.add(newLogJob, function (error, result) {
    if (error || !result) {
      return reply(boom.badImplementation('Failed to store in the DB new log shipping job ' + JSON.stringify(newLogJob)));
    }

    var newJobObject = publicRecordFields.handle(result, 'LogShippingJob');
    newJobObject.destination_key = '<Hidden for security reasons>';
    newJobObject.destination_password = '<Hidden for security reasons>';

    AuditLogger.store({
      account_id       : result.account_id,
      activity_type    : 'add',
      activity_target  : 'logshippingjob',
      target_id        : result.id,
      target_name      : result.job_name,
      target_object    : newJobObject,
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
  var foundShippingJob;
  var updatedLogJob = request.payload;
  var logJobId = request.params.log_job_id;
  updatedLogJob.id = logJobId;

  return Promise.try(function(resolve, reject) {
      return logShippingJobs.getAsync(logJobId);
    })
    .then(function (result) {
      if (!result) {
        throw new Error('Failed to retrieve details for log shipping job ID ' + logJobId);
      }

      if (!utils.checkUserAccessPermissionToLogShippingJob(request, result)) {
        throw new Error('Log shipping job ID not found');
      }

      if (!utils.checkUserAccessPermissionToAccount(request, updatedLogJob.account_id)) {
        throw new Error('Account ID not found');
      }

      foundShippingJob = result;
    })
    .then(function () {
      if (updatedLogJob.destination_type === 's3') {
        updatedLogJob.destination_port = '';
        updatedLogJob.destination_username = '';
      } else if (updatedLogJob.destination_type === 'ftp') {
        updatedLogJob.destination_key = '';
      } else if (updatedLogJob.destination_type === 'sftp') {
        updatedLogJob.destination_key = '';
      } else if (updatedLogJob.destination_type === 'elasticsearch') {
        updatedLogJob.destination_username = '';
        updatedLogJob.destination_password = '';
      }

      return new Promise(function(resolve, reject) {
        if (updatedLogJob.source_type === 'domain') {
          // Check if the user/api key able to control domain
          domainConfigs.getAsync(updatedLogJob.source_id)
            .then(function (result) {
              if (!result || !utils.checkUserAccessPermissionToDomain(request, result)) {
                return reject(Error('Domain ID not found'));
              } else {
                return resolve(true);
              }
            });
        } else if (updatedLogJob.source_type === 'app') {
          // Check if the user/api key able to control app
          apps.getAsync(updatedLogJob.source_id)
            .then(function (result) {
              if (!result || !utils.checkUserAccessPermissionToApps(request, result)) {
                return reject(Error('App ID not found'));
              } else {
                return resolve(true);
              }
            });
        }
      });
    })
    .then(function (result) {
      updatedLogJob.updated_by = utils.generateCreatedByField(request);

      if (updatedLogJob.operational_mode === 'active' && !updatedLogJob.destination_host) {
        return Promise.reject(Error('Cannot activate unconfigured logshipping job'));
      }

      return logShippingJobs.updateAsync(updatedLogJob);
    })
    .then(function (result) {
      if (!result) {
        throw new Error('Failed to update the DB for log shipping job ID ' + logJobId);
      }

      var updatedJobObject = publicRecordFields.handle(result, 'LogShippingJob');
      updatedJobObject.destination_key = '<Hidden for security reasons>';
      updatedJobObject.destination_password = '<Hidden for security reasons>';

      AuditLogger.store({
        account_id: result.account_id,
        activity_type: 'modify',
        activity_target: 'logshippingjob',
        target_id: logJobId,
        target_name: result.job_name,
        target_object: updatedJobObject,
        operation_status: 'success'
      }, request);

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the log shipping job'
      };

      return renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (/Failed to retrieve details/.test(error.message)) {
        return reply(boom.badRequest(error.message));
      } else if (/Failed to update the DB/.test(error.message)) {
        return reply(boom.badImplementation(error.message));
      } else if (/App ID not found/.test(error.message)) {
        return reply(boom.badRequest(error.message));
      } else if (/Domain ID not found/.test(error.message)) {
        return reply(boom.badRequest(error.message));
      } else if (/Log shipping job ID not found/.test(error.message)) {
        return reply(boom.badRequest(error.message));
      } else if (/Account ID not found/.test(error.message)) {
        return reply(boom.badRequest(error.message));
      } else if (/Cannot activate unconfigured/.test(error.message)) {
        return reply(boom.badRequest('Logshipping job should be configured before starting'));
      } else {
        return reply(boom.badImplementation(error.message));
      }
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
