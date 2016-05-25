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
var ServerGroup         = require('../models/ServerGroup');
var Account = require('../models/Account');
var SSLCertificate = require('../models/SSLCertificate');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var serverGroups         = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslCertificates = new SSLCertificate(mongoose, mongoConnection.getConnectionPortal());

var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};

exports.getSSLCertificateStatus = function(request, reply) {

  var sslCertId = request.params.ssl_cert_id;
  sslCertificates.get(sslCertId, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive the details for SSL certificate ID ' + sslCertId));
    }
    if (!result || !utils.checkUserAccessPermissionToSSLCertificate(request,result)) {
      return reply(boom.badRequest('SSL certificate ID not found'));
    }

    cds_request( { url: config.get('cds_url') + '/v1/ssl_certs/' + sslCertId + '/config_status',
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the status for SSL certificate ' + sslCertId));
      }
      var response_json = JSON.parse(body);
      if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
      } else {
        renderJSON(request, reply, err, response_json);
      }
    });
  });
};


exports.listSSLCertificates = function(request, reply) {

  cds_request( { url: config.get('cds_url') + '/v1/ssl_certs',
    headers: authHeader
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get from CDS a list of SSL certificates'));
    }
    var response_json = JSON.parse(body);
    if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
    } else {
      if (!response_json || !utils.isArray(response_json)) {
        return reply(boom.badImplementation('Recevied a strange CDS response for a list of SSL certificates: ' + response_json));
      }
      var response = [];
      for (var i=0; i < response_json.length; i++) {
        if (utils.checkUserAccessPermissionToSSLCertificate(request,response_json[i])) {
          response.push(publicRecordFields.handle(response_json[i], 'sslCertificates'));
        }
      }
      renderJSON(request, reply, err, response);
    }
  });

};

exports.getSSLCertificate = function(request, reply) {

  var sslCertId = request.params.ssl_cert_id;

  sslCertificates.get(sslCertId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL certificate ID ' + sslCertId));
    }
    if (!result || !utils.checkUserAccessPermissionToSSLCertificate(request,result)) {
      return reply(boom.badRequest('SSL certificate ID not found'));
    }

    logger.info('Calling CDS to get configuration for SSL certificate ID ' + sslCertId);
    cds_request( { url: config.get('cds_url') + '/v1/ssl_certs/' + sslCertId,
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the configuration for SSL certificate ID ' + sslCertId));
      }
      var response_json = JSON.parse(body);
      if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
      }
      var response = publicRecordFields.handle(response_json, 'sslCertificate');

      renderJSON(request, reply, err, response);
    });
  });
};

exports.createSSLCertificate = function(request, reply) {

  var newSSLCert = request.payload;
  if (!utils.checkUserAccessPermissionToSSLCertificate(request, newSSLCert)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  newSSLCert.created_by = utils.generateCreatedByField(request);

  var newSSLCert2 = publicRecordFields.handle(newSSLCert, 'sslCertificate');
  logger.info('Calling CDS to create a new SSL certificate ' + JSON.stringify(newSSLCert2));
  cds_request({method: 'POST', url: config.get('cds_url') + '/v1/ssl_certs', body: JSON.stringify(newSSLCert), headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('CDS failed to create a new SSL certificate '  + JSON.stringify(newSSLCert2)));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else if (res.statusCode === 200) {
      newSSLCert2.id = response_json.id;
      newSSLCert2.private_ssl_key = '<Hidden for security reasons>';
      newSSLCert2.private_ssl_key_passphrase = '<Hidden for security reasons>';
      AuditLogger.store({
        account_id      : newSSLCert.account_id,
        activity_type   : 'add',
        activity_target : 'sslcert',
        target_id       : response_json.id,
        target_name     : newSSLCert.cert_name,
        target_object   : newSSLCert2,
        operation_status: 'success'
      }, request);
      renderJSON(request, reply, err, response_json);
    } else {
      return reply(boom.create(res.statusCode, res.message));
    }
  });
};

exports.updateSSLCertificate = function(request, reply) {

  var newSSLCert = request.payload;
  var sslCertId = request.params.ssl_cert_id;
  var optionsFlag = (request.query.options) ? '?options=' + request.query.options : '';
//   return reply(boom.badImplementation('Failed to retrieve details for SSL certificate ID ' + sslCertId));

  sslCertificates.get(sslCertId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL certificate ID ' + sslCertId));
    }
    if (!result || !utils.checkUserAccessPermissionToSSLCertificate(request,result)) {
      return reply(boom.badRequest('SSL certificate ID not found'));
    }

    if (!utils.checkUserAccessPermissionToAccount(request, newSSLCert.account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    newSSLCert.updated_by = utils.generateCreatedByField(request);

    logger.info('Calling CDS to update configuration for SSL certificate ID: ' + sslCertId +', optionsFlag: ' + optionsFlag);

    cds_request( { url: config.get('cds_url') + '/v1/ssl_certs/' + sslCertId + optionsFlag,
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify(newSSLCert)
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to update the CDS with confguration for SSL certificate ID ' + sslCertId));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      }
      var response = response_json;

      var action = '';
      if (request.query.options && request.query.options === 'publish') {
        action = 'publish';
      } else if (!request.query.options || request.query.options !== 'verify_only') {
        action = 'modify';
      }
      var result2 = publicRecordFields.handle(newSSLCert, 'sslCertificate');
      result2.private_ssl_key = '<Hidden for security reasons>';
      result2.private_ssl_key_passphrase = '<Hidden for security reasons>';
      if (action !== '') {
        AuditLogger.store({
          account_id       : newSSLCert.account_id,
          activity_type    : action,
          activity_target  : 'sslcert',
          target_id        : sslCertId,
          target_name      : result2.cert_name,
          target_object    : result2,
          operation_status : 'success'
        }, request);
      }
      renderJSON(request, reply, err, response);
    });
  });
};

exports.deleteSSLCertificate = function(request, reply) {

  var sslCertId = request.params.ssl_cert_id;

  sslCertificates.get(sslCertId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL certificate ID ' + sslCertId));
    }
    
    if (!result || !utils.checkUserAccessPermissionToSSLCertificate(request,result)) {
      return reply(boom.badRequest('SSL certificate ID not found'));
    }
  
    domainConfigs.query( { 'ssl_cert_id': sslCertId, deleted: false }, function(error,res) {
      if (error) {
        return reply(boom.badImplementation('Failed to validate that certificate ' + sslCertId + ' is not in use by a domain configuration'));
      }
      if (res && res.length > 0) {
        return reply(boom.badRequest('The SSL certificate is in use by active domain(s) - please update the domain(s) before removing the SSL certificate'));
      }

      var deleted_by = utils.generateCreatedByField(request);

      logger.info('Calling CDS to delete SSL certificate ID ' + sslCertId);
  
      cds_request( { url: config.get('cds_url') + '/v1/ssl_certs/' + sslCertId + '?deleted_by="' + deleted_by + '"',
        method: 'DELETE',
        headers: authHeader,
      }, function (err, res, body) {
        if (err) {
          return reply(boom.badImplementation('Failed to send a CDS command to delete SSL certificate ID ' + sslCertId));
        }
        var response_json = JSON.parse(body);
        if (res.statusCode === 400) {
          return reply(boom.badRequest(response_json.message));
        }

        var result2 = publicRecordFields.handle(result, 'sslCertificate');
        result2.private_ssl_key = '<Hidden for security reasons>';
        result2.private_ssl_key_passphrase = '<Hidden for security reasons>';

        AuditLogger.store({
          account_id       : result.account_id,
          activity_type    : 'delete',
          activity_target  : 'sslcert',
          target_id        : sslCertId,
          target_name      : result.cert_name,
          target_object    : result2,
          operation_status : 'success'
        }, request);
        var response = response_json;
        renderJSON(request, reply, err, response);
      });
    });
  });
};
