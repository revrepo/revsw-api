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

var Account = require('../models/Account');
var SSLName = require('../models/SSLName');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

exports.listSSLNames = function(request, reply) {
  sslNames.list(function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve from the DB a list of SSL names'));
    }

    var response = [];
    for (var i=0; i < result.length; i++) {
      if (utils.checkUserAccessPermissionToSSLName(request,result[i])) {
        response.push(result[i]);
      }
    }
    var response2 = publicRecordFields.handle(response, 'sslNames');
    renderJSON(request, reply, error, response2);
  });
};

exports.getSSLName = function(request, reply) {

  var sslNameId = request.params.ssl_name_id;

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }
    if (!result || !utils.checkUserAccessPermissionToSSLName(request,result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    var response = publicRecordFields.handle(result, 'sslName');
    renderJSON(request, reply, error, response);
  });
};

exports.getSSLNameApprovers = function(request, reply) {

  var domain = request.params.domain_name;

};

exports.addSSLName = function(request, reply) {

  var newSSLName = request.payload;

  if (!utils.checkUserAccessPermissionToSSLName(request,newSSLName)) {
    return reply(boom.badRequest('SSL name ID not found'));
  }

  newSSLName.created_by = utils.generateCreatedByField(request);

/*

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
*/

};

exports.verifySSLName = function(request, reply) {

  var sslNameId = request.params.ssl_name_id;

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }

    // TODO add a permissions check for new account_id
    if (!result || !utils.checkUserAccessPermissionToSSLName(request,result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

/*

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
*/

  });
};

exports.deleteSSLName = function(request, reply) {

  var sslNameId = request.params.ssl_name_id;

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }
    
    if (!result || !utils.checkUserAccessPermissionToSSLName(request,result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

/*
  
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
*/

  });
};
