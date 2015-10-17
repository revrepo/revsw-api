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
var uuid        = require('node-uuid');
var AuditLogger = require('revsw-audit');
var config      = require('config');
var cds_request = require('request');

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');

var Domain   = require('../models/Domain');
var PurgeJob = require('../models/PurgeJob');

var domains   = new Domain(mongoose, mongoConnection.getConnectionPortal());
var purgeJobs = new PurgeJob(mongoose, mongoConnection.getConnectionPurge());

//
// Management of purges
//
exports.purgeObject = function(request, reply) {
  var domain = request.payload.domainName;
  if (request.auth.credentials.domain && request.auth.credentials.domain.indexOf(domain) === -1) {
    return reply(boom.badRequest('Domain not found'));
  }
  domains.get({
    name : domain
  }, function (error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrive domain details'));
    }

    if (!result) {
      return reply(boom.badRequest('Domain not found'));
    }

    if (request.auth.credentials.companyId.indexOf(result.companyId) === -1) {
      return reply(boom.badRequest('Domain not found'));
    }

    if (!result.stats_url) {
      return reply(boom.badImplementation('stats_url is empty'));
    }

    var proxy_list = result.stats_url.split(',');

    for (var i1 = 0; i1 < proxy_list.length; i1++) {
      proxy_list[i1] = proxy_list[i1].split(':')[0];
    }

    var newPurgeJob = {};
    newPurgeJob.request_json = request.payload;
    newPurgeJob.req_id = uuid.v1();
    for (var i = 0; i < newPurgeJob.request_json.purges.length; i++) {
      newPurgeJob.request_json.purges[i].url.domain = domain;
    }
    delete newPurgeJob.request_json.domain;
    newPurgeJob.request_json.version = 1;
    newPurgeJob.req_domain = domain;
    newPurgeJob.req_email = request.auth.credentials.email;
    newPurgeJob.proxy_list = proxy_list.join(',').toLowerCase();
    console.log('purge job to write = ', JSON.stringify(newPurgeJob));
    purgeJobs.add(newPurgeJob, function (error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to write a new purgeJob object'));
      }
      var purgeStatusResponse;
      purgeStatusResponse = {
        statusCode : 200,
        message    : 'The purge request has been successfully queued',
        request_id : result.req_id
      };

      AuditLogger.store({
        ip_adress        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        domain_id        : request.auth.credentials.domain,
        activity_type    : 'purge',
        activity_target  : 'purge',
        target_id        : result.id,
        target_name      : result.req_email,
        target_object    : newPurgeJob,
        operation_status : 'success'
      });

      renderJSON(request, reply, error, purgeStatusResponse);
    });
  });
};


/*
// Old version of purge API
exports.purgeObject_v0 = function (request, reply) {
  var domain = request.payload.domainName;

  if (request.auth.credentials.domain && request.auth.credentials.domain.indexOf(domain) === -1) {
    return reply(boom.badRequest('Domain not found'));
  }
  domains.get({
    name : domain
  }, function (error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrive domain details'));
    }

    if (!result) {
      return reply(boom.badRequest('Domain not found'));
    }

    if (request.auth.credentials.companyId.indexOf(result.companyId) === -1) {
      return reply(boom.badRequest('Domain not found'));
    }

    if (!result.stats_url) {
      return reply(boom.badImplementation('stats_url is empty'));
    }

    var proxy_list = result.stats_url.split(',');

    for (var i1 = 0; i1 < proxy_list.length; i1++) {
      proxy_list[i1] = proxy_list[i1].split(':')[0];
    }

    var newPurgeJob = {};

    newPurgeJob.request_json = request.payload;
    newPurgeJob.req_id = uuid.v1();

    for (var i = 0; i < newPurgeJob.request_json.purges.length; i++) {
      newPurgeJob.request_json.purges[i].url.domain = domain;
    }

    delete newPurgeJob.request_json.domain;

    newPurgeJob.request_json.version = 1;
    newPurgeJob.req_domain = domain;
    newPurgeJob.req_email = request.auth.credentials.email;
    newPurgeJob.proxy_list = proxy_list.join(',').toLowerCase();

    purgeJobs.add(newPurgeJob, function (error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to write a new purgeJob object'));
      }
      var purgeStatusResponse;
      purgeStatusResponse = {
        status     : 202,
        message    : 'The purge request has been successfully queued',
        request_id : result.req_id
      };

      AuditLogger.store({
        ip_adress        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        domain_id        : request.auth.credentials.domain,
        activity_type    : 'add',
        activity_target  : 'purge',
        target_id        : result.id,
        target_name      : result.req_email,
        target_object    : newPurgeJob,
        operation_status : 'success'
      });

      reply(purgeStatusResponse).code(202);
    });
  });
};

*/

exports.getPurgeJobStatus = function(request, reply) {

  var request_id = request.params.request_id;
  cds_request( { url: config.get('cds_url') + '/v1/purge/' + request_id,
    headers: {
      Authorization: 'Bearer ' + config.get('cds_api_token')
    }
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get purge job details from the CDS'));
    }
    var response_json = JSON.parse(body);
    if ( res.statusCode === 400 ) {
      return reply(boom.badRequest(response_json.message));
    } else {
      renderJSON(request, reply, err, response_json);
    }
  });
};

/*

exports.getPurgeJobStatus_v0 = function (request, reply) {

  var request_id = request.payload.req_id;

  var request_id = request.params.request_id;
  cds_request( { url: config.get('cds_url') + '/v1/purge/' + request_id,
    headers: {
      Authorization: 'Bearer ' + config.get('cds_api_token')
    }
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get purge job details from the CDS'));
    }
    var response_json = JSON.parse(body);
    renderJSON(request, reply, err, response_json);
  });


  purgeJobs.get(request_id, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get purge job status'));
    }

    if (result) {
      var statusResponse;
      statusResponse = {
        req_id  : request_id,
        status  : 200,
        message : ''
      };

      if (result.req_status === 'success') {
        statusResponse.message = 'Purge Successful';
      } else if (result.req_status === 'failed') {
        statusResponse.message = 'In Progress';
      } else {
        statusResponse.message = result.req_status;
      }

      renderJSON(request, reply, error, statusResponse);
    } else {
      reply(boom.badRequest('Purge job ID not found'));
    }
  });
};

*/

