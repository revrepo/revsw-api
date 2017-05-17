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
var AuditLogger = require('../lib/audit');
var config      = require('config');
var cds_request = require('request');
var utils           = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var DomainConfig   = require('../models/DomainConfig');
var PurgeJob = require('../models/PurgeJob');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var purgeJobs = new PurgeJob(mongoose, mongoConnection.getConnectionPurge());

var queryString = require('querystring');
//
// Management of purges
//
exports.purgeObject = function(request, reply) {
  var domainName = request.payload.domainName;
  var requestedEnvironment = request.payload.environment;
  var purges = request.payload.purges;
  var purgeImageEngineSecondaryCache = request.query.purge_image_engine_secondary_cache;
  var accountId;
  var domainId;

  domainConfigs.query({
    domain_name : domainName
  }, function (error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrive domain details for domain name ' + domainName));
    }

    if (!result[0] || !utils.checkUserAccessPermissionToDomain(request, result[0])) {
      return reply(boom.badRequest('Domain not found'));
    }
    result = result[0];

    domainId = result._id;
    accountId = result.proxy_config.account_id;

    var PurgeJobJson = {
      domain_name: domainName,
      request_email: request.auth.credentials.email,
      environment: requestedEnvironment,
      purges: purges
    };
    var options ={
      purge_image_engine_secondary_cache: purgeImageEngineSecondaryCache
    };

    cds_request.post( {
      url: config.get('cds_url') + '/v1/purge?' + queryString.stringify(options),
      headers: {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      },
      form: PurgeJobJson
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to queue purge job for ' + domainName));
      }
      var response_json = JSON.parse(body);
      logger.debug('purgeObject: ' + config.get('cds_url') + '/v1/purge : response', response_json);

      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        return reply(boom.badImplementation('Error occurred while processing your request, try again later'));
      } else {
        var purgeObjectResponse = response_json.request_object;
        var purgeRequestIdResponse = response_json.request_id;

        var purgeStatusResponse = {
          statusCode : 200,
          message    : 'The purge request has been successfully queued',
          request_id : purgeRequestIdResponse
        };

        var PurgeJobResponse = publicRecordFields.handle(purgeObjectResponse, 'purge');

        AuditLogger.store({
          account_id       : accountId,
          activity_type    : 'purge',
          activity_target  : 'domain',
          target_id        : domainId,
          target_name      : PurgeJobResponse.req_domain,
          target_object    : PurgeJobResponse,
          operation_status : 'success'
        }, request);

        renderJSON(request, reply, error, purgeStatusResponse);
      }
    });
  });
};

exports.getPurgeJobStatus = function(request, reply) {
  var request_id = request.params.request_id;
  logger.info('getPurgeJobStatus: ', config.get('cds_url') + '/v1/purge/' + request_id);
  cds_request( { url: config.get('cds_url') + '/v1/purge/' + request_id,
    headers: {
      Authorization: 'Bearer ' + config.get('cds_api_token')
    }
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get purge job details from the CDS for request ID ' + request_id));
    }
    var response_json = JSON.parse(body);
    logger.info('getPurgeJobStatus: response_json', response_json);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation('Error occurred while processing your request, try again later'));
    } else {
      renderJSON(request, reply, err, response_json);
    }
  });
};


exports.getPurgeJobs = function(request, reply) {
  var domainId = request.query.domain_id;
  var options = {
    skip: request.query.skip || 0,
    limit: request.query.limit || 10,
    domain_id: domainId
  };
  var filter = {};
  domainConfigs.get(domainId, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive domain details for domain ID ' + domainId));
    }
    if (!result || !utils.checkUserAccessPermissionToDomain(request, result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    cds_request({
      url: config.get('cds_url') + '/v1/purge?' + queryString.stringify(options),
      headers: {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      }
    }, function(err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get purge job list from the CDS'));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      } else {
        renderJSON(request, reply, err, response_json);
      }
    });
  });
};


