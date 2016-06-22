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
var config = require('config');
var utils = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
var _ = require('lodash');

var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var GlobalSign = require('../lib/globalSignAPI');
var Account = require('../models/Account');
var SSLName = require('../models/SSLName');
var x509 = require('x509');
var tld = require('tldjs');

var cdsRequest = require('request');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};

var globalSignApi = new GlobalSign();
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

var generateVerificationNames = function (data) {
  var arrDomain = data.ssl_name.split('.');
  var verificationNames = [];
  if (arrDomain[0] === '*') {
    verificationNames.push(data.ssl_name.replace(arrDomain[0] + '.', ''));
    if(tld.getDomain(data.ssl_name.replace(arrDomain[0] + '.', '')) !== data.ssl_name.replace(arrDomain[0] + '.', '')){
        verificationNames.push(tld.getDomain(data.ssl_name.replace(arrDomain[0] + '.', '')));
    }
  } else {
    if (data.verification_method !== 'url') {
      verificationNames.push(data.ssl_name);
      if(tld.getDomain(data.ssl_name) !== data.ssl_name){
        verificationNames.push(data.ssl_name.replace(arrDomain[0] + '.', ''));
      }
    } else {
      verificationNames.push('http://' + data.ssl_name);
      verificationNames.push('https://' + data.ssl_name);

      if(tld.getDomain(data.ssl_name) !== data.ssl_name){
        verificationNames.push('http://' + data.ssl_name.replace(arrDomain[0] + '.', ''));
        verificationNames.push('https://' + data.ssl_name.replace(arrDomain[0] + '.', ''));
      }
    }
  }
  data.verification_names = verificationNames;
  return data;
};

// This function should be used to "beatify" GlobalSign's error messages returned to API user
var sendStatusReport = function (request, reply, error, statusCode, message, objectId) {
  var statusResponse;
  statusResponse = {
    statusCode: statusCode,
    message: message
  };
  if(objectId){
    statusResponse.object_id = objectId;
  }
  if(statusCode === 400){
    statusResponse.error = error;
    logger.info(error);
    return reply(statusResponse, error).code(400);
  }
  logger.debug(statusResponse);
  renderJSON(request, reply, error, statusResponse);
};

exports.listSSLNames = function (request, reply) {

  sslNames.list(function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve from the DB a list of SSL names', error));
    }

    var response = publicRecordFields.handle(result, 'sslNames');
    var response2 = [];
    for (var i = 0; response.length > i; i++) {
      if (utils.checkUserAccessPermissionToSSLName(request, response[i])) {
        response2.push(generateVerificationNames(response[i]));
      }
    }

    renderJSON(request, reply, error, response2);
  });

};

exports.getSSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;
  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId, error));
    }
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    var response = publicRecordFields.handle(result, 'sslName');
    renderJSON(request, reply, error, generateVerificationNames(response));
  });

};

exports.getSSLNameApprovers = function (request, reply) {
  var sslName = request.query.ssl_name;
  var approvers = '';

  logger.info('Getting a list of SSL name approvers for domain ' + sslName);
  globalSignApi.getStatus(function (error, data) {
    if (error) {
      sendStatusReport(request, reply, error, 400, 'Failed to retrieve GS status for SSL name ' + sslName);
    } else {
      var fqdn = data.output.message.Response.OrderDetail.OrderInfo.DomainName;
      globalSignApi.getApproveList(sslName, fqdn, function (error, data) {
        if (error) {
          sendStatusReport(request, reply, error, 400, 'Failed to retrieve from GS a list of approvals for SSL name ' + sslName);
        } else {
          if (data && data.output && data.output.message && data.output.message.Response.Approvers && data.output.message.Response.Approvers[0] &&
            data.output.message.Response.Approvers[0].Approver) {
            var approversList = _.map(data.output.message.Response.Approvers[0].Approver, function(item){
              return {
                approver_email: item.ApproverEmail
              };
            });
            renderJSON(request, reply, error, approversList);
          } else {
            return reply(boom.badRequest('Failed to generate a list of approver emails. Please use another domain name or try again later.'));
          }
        }
      });
    }
  });
};

exports.addSSLName = function (request, reply) {
  var accountId = request.payload.account_id;
  var SSLName = request.payload.ssl_name;
  var verificationMethod = request.payload.verification_method;
  var verificationEmail = request.payload.verification_email;
  var verificationWildcard = request.payload.verification_wildcard;
  var createdBy = utils.generateCreatedByField(request);
  var approvers = '';
  var verificationObject = '';
  var status;

  function createNewSSLName(accountId, SSLName, created_by, verificationMethod, verificationObject, approvers) {
    var newSSLArray = {
      account_id: accountId,
      ssl_name: SSLName,
      created_by: createdBy,
      deployed: false,
      deployed_at: '',
      deployed_by: '',
      deleted: false,
      deleted_at: '',
      deleted_by: '',
      updated_by: createdBy,
      verified: false,
      verified_by: '',
      verification_method: verificationMethod,
      verification_object: verificationObject,
      comment: '',
      approvers: approvers
    };

    sslNames.add(newSSLArray, function (error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to add SSL name ID ' + SSLName, error));
      }
      var result_ = publicRecordFields.handle(result, 'sslName');
      AuditLogger.store({
        account_id      : accountId,
        activity_type   : 'add',
        activity_target : 'sslname',
        target_id       : result_.id,
        target_name     : SSLName,
        target_object: publicRecordFields.handle(result_, 'sslName'),
        operation_status: 'success'
      }, request);

      sendStatusReport(request, reply, error, 200, 'Successfully added new SSL name', result_.id);
    });
  }

  if (!utils.checkUserAccessPermissionToSSLName(request, { account_id: accountId })) {
    return reply(boom.badRequest('Account ID not found'));
  }

  sslNames.getByName(SSLName, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + SSLName, error));
    }

    if (result) {
      return reply(boom.badRequest('The SSL name is already registered in the system'));
    } else {
      if (verificationMethod === 'email') {
        globalSignApi.getStatus(function (error, data) {
          if (error) {
            sendStatusReport(request, reply, error, 400, 'Failed to retrieve status for SSL name ' + SSLName);
          } else {
            var fqdn = data.output.message.Response.OrderDetail.OrderInfo.DomainName;
            globalSignApi.getApproveList(SSLName, fqdn, function (error, data) {
              if (error) {
                sendStatusReport(request, reply, error, 400, 'Failed to retrieve from GS a list of approval emails for SSL name ' + SSLName);
              } else {
                approvers = data.output.message.Response.Approvers[0];
                if (approvers !== '') {
                  globalSignApi.sanModifyOperation(SSLName, 'ADDITION', verificationMethod, verificationEmail, verificationWildcard, function (error, data) {
                    if (error) {
                      sendStatusReport(request, reply, error, 400, 'Failed to add to GS a new SSL name ' + SSLName);
                    } else {
                      status = data.output.message.Response.OrderResponseHeader.SuccessCode;
                      logger.info(status);
                    }
                  });
                  verificationObject = 'Waiting on email verification';
                  createNewSSLName(accountId, SSLName, createdBy, verificationMethod, verificationObject, approvers);
                }
              }
            });
          }
        });

      } else {
        globalSignApi.sanModifyOperation(SSLName, 'ADDITION', verificationMethod, verificationEmail, verificationWildcard, function (error, data) {
          if (error) {
            sendStatusReport(request, reply, error, 400, 'GS failed to add new SSL name ' + SSLName);
          } else {
            // console.log(data.output.message);
            if (verificationMethod === 'url') {
              verificationObject = data.output.message.Response.CloudOVSANInfo.MetaTag;
            } else {
              verificationObject = data.output.message.Response.CloudOVSANInfo.TxtRecord;
            }

            createNewSSLName(accountId, SSLName, createdBy, verificationMethod, verificationObject, approvers);
          }
        });
      }
    }
  });
};

exports.verifySSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;
  var url = request.query.url;

  function setStatusVerified(request, reply, response) {
    response.verified = true;
    sslNames.update(response, function (error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to update details for SSL name ID ' + sslNameId));
      }

      AuditLogger.store({
        account_id: result.account_id,
        activity_type: 'verify',
        activity_target: 'sslname',
        target_id: result._id,
        target_name: result.ssl_name,
        target_object: publicRecordFields.handle(result, 'sslName'),
        operation_status: 'success'
      }, request);

      sendStatusReport(request, reply, error, 200, 'The domain control has been successfully verified', result.id);
    });
  }

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId, error));
    }

    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    if (result.verification_method === 'email') {
      globalSignApi.getStatus(function (error, data) {
        if (error) {
          sendStatusReport(request, reply, error, 400, 'Failed to retrieve details for SSL name ID ' + sslNameId);
        } else {
          var domain;
          var domains = data.output.message.Response.OrderDetail.CloudOVSANInfo.CloudOVSANDetail;
          for (var i = 0; domains.length > i; i += 1) {
            if (domains[i].CloudOVSAN === result.ssl_name) {
              if (domains[i].CloudOVSANStatus !== '8' && domains[i].CloudOVSANStatus !== '9') {
                domain = domains[i];
              }
            }
          }
          if (domain.CloudOVSANStatus === '2' || domain.CloudOVSANStatus === '3') {
            setStatusVerified(request, reply, result);
          } else {
            sendStatusReport(request, reply, error, 200, globalSignApi.sanStatusCode[domain.CloudOVSANStatus], result.id);
          }
        }
      });
    } else if (result.verification_method === 'url') {

      globalSignApi.urlVerification(result.ssl_name, url, function (error, data) {
        if (error) {
          sendStatusReport(request, reply, error, 400, 'Failed to verify for SSL name ID ' + sslNameId);
        } else {
          if (data.output.message.Response.OrderResponseHeader.Errors === null && data.output.message.Response.OrderResponseHeader.SuccessCode === 0) {
            setStatusVerified(request, reply, result);
          } else {
            sendStatusReport(request, reply, data.output.message.Response.OrderResponseHeader.Errors.Error, 400, 'Failed to verify SSL name ID ' + sslNameId);
          }
        }
      });

    } else if (result.verification_method === 'dns') {

      globalSignApi.dnsVerification(result.ssl_name, url, function (error, data) {
        if (error) {
          sendStatusReport(request, reply, error, 400, 'Failed to verify for SSL name ID ' + sslNameId);
        } else {
          if (data.output.message.Response.OrderResponseHeader.Errors === null && data.output.message.Response.OrderResponseHeader.SuccessCode === 0) {
            setStatusVerified(request, reply, result);
          } else {
            sendStatusReport(request, reply, data.output.message.Response.OrderResponseHeader.Errors.Error, 400, 'Failed to verify SSL name ID ' + sslNameId);
          }
        }
      });
    } else {
      sendStatusReport(request, reply, error, 400, 'Failed to verify SSL name ID ' + sslNameId);
    }
  });
};

exports.deleteSSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;

  var setDelete = function (response) {
        sslNames.update(response, function (error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to update details for SSL name ID ' + sslNameId));
      }

      AuditLogger.store({
        account_id      : result.account_id,
        activity_type   : 'delete',
        activity_target : 'sslname',
        target_id       : result._id,
        target_name     : result.ssl_name,
        target_object   : publicRecordFields.handle(result, 'sslName'),
        operation_status: 'success'
      }, request);

      sendStatusReport(request, reply, error, 200, 'Successfully deleted the SSL name', result.id);
    });
  };

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId, error));
    }
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    var response = publicRecordFields.handle(result, 'sslName');
    response.deleted = true;
    response.deleted_at = new Date();
    response.deleted_by = utils.generateCreatedByField(request);

    if (response.published === true) {
      globalSignApi.sanModifyOperation(response.ssl_name, 'DELETE', response.verification_method, response.verification_object, false, function (error, data) {
        if (error) {
          sendStatusReport(request, reply, error, 400, 'Failed to delete SSL name ID ' + sslNameId);
        }else{
          setDelete(response);
        }
      });
    } else {
      globalSignApi.sanModifyOperation(response.ssl_name, 'CANCEL', response.verification_method, response.verification_object, false, function (error, data) {
        if (error) {
          sendStatusReport(request, reply, error, 400, 'Failed to cancel SSL name ID ' + sslNameId);
        }else{
          setDelete(response);
        }
      });
    }


  });
};
