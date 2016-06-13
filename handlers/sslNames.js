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
var cds_request = require('request');
var utils = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
var _ = require('lodash');

var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var GlobalSign = require('../lib/globalsignapi');

var Account = require('../models/Account');
var SSLName = require('../models/SSLName');

var globalSignApi = new GlobalSign();
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

exports.listSSLNames = function (request, reply) {
  sslNames.list(function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve from the DB a list of SSL names'));
    }

    var response2 = publicRecordFields.handle(result, 'sslNames');
    renderJSON(request, reply, error, response2);
  });

};

exports.getSSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }
    /*
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }
    */

    var response = publicRecordFields.handle(result, 'sslName');
    renderJSON(request, reply, error, response);
  });

};

exports.getSSLNameApprovers = function (request, reply) {
  var sslNameId = request.params.ssl_name_id;
  var approvers = '';

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }

    globalSignApi.getStatus(function (err, data) {
      if (err) {
        console.log(err);
        return reply(boom.badImplementation('Failed to retrieve status for SSL name ' + SSLName));
      } else {
        console.log(data.output.message);
        var fqdn = data.output.message.Response.OrderDetail.OrderInfo.DomainName;
        //console.log(fqdn);
        globalSignApi.getApproveList(result.ssl_name, fqdn, function (err, data) {
          if (err) {
            console.log(err);
            return reply(boom.badImplementation('Failed to retrieve approve for SSL name ' + SSLName));
          } else {
            console.log(data.output.message);
            approvers = data.output.message.Response.Approvers[0];
            renderJSON(request, reply, err, approvers);
          }
        });
      }
    });

  });
};

exports.addSSLName = function (request, reply) {
  var accountId = request.payload.account_id;
  var SSLName = request.payload.ssl_name;
  var verificationMethod = request.payload.verification_method;
  var verificationEmail = request.payload.verification_email;
  var verificationWildcard = request.payload.verification_wildcard;
  var approvers = '';
  var verificationObject = '';
  var status;

  function createNewSSL (SSLName, verificationMethod, verificationObject, approvers) {
    var newSSLArray = {
              account_id: accountId,
              ssl_name: SSLName,
              created_by: utils.generateCreatedByField(request),
              deployed: false,
              deployed_at: '',
              deployed_by: '',
              deleted: false,
              deleted_at: '',
              deleted_by: '',
              updated_by: '',
              verified: false,
              verified_by: '',
              verification_method: verificationMethod,
              verification_object: verificationObject,
              comment: '',
              approvers: approvers
            };
            console.log(newSSLArray);
            sslNames.add(newSSLArray, function (error, result) {
              var statusResponse;
              if (result) {
                statusResponse = {
                  statusCode: 200,
                  message: 'Successfully created new user',
                  object_id: result.ssl_name_id
                };
              }
              //result = publicRecordFields.handle(result, 'addSSLName');
              renderJSON(request, reply, error, statusResponse);
            });
  }

  sslNames.getbyname(SSLName, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + SSLName));
    }

    if (result) {
      var statusResponse = {
        statusCode: 202,
        message: 'Already Exists',
        object_id: result.ssl_name_id
      };
      renderJSON(request, reply, error, statusResponse);
    } else {

      if (verificationMethod === 'email') {

        globalSignApi.getStatus(function (err, data) {
          if (err) {
            console.log(err);
            return reply(boom.badImplementation('Failed to retrieve status for SSL name ' + SSLName));
          } else {
            console.log(data.output.message);
            var fqdn = data.output.message.Response.OrderDetail.OrderInfo.DomainName;
            //console.log(fqdn);
            globalSignApi.getApproveList(SSLName, fqdn, function (err, data) {
              if (err) {
                console.log(err);
                return reply(boom.badImplementation('Failed to retrieve approve for SSL name ' + SSLName));
              } else {
                console.log(data.output.message);
                approvers = data.output.message.Response.Approvers[0];
                if (approvers !== '') {
                  globalSignApi.sanModifyOperation(SSLName, 'ADDITION', verificationMethod, verificationEmail, verificationWildcard, function (err, data) {
                    if (err) {
                      console.log(err);
                      return reply(boom.badImplementation('Failed addition SSL name ' + SSLName));
                    } else {
                      console.log(data.output.message);
                      //renderJSON(request, reply, err, data.output.message);
                      status = data.output.message.Response.OrderResponseHeader.SuccessCode;
                    }
                  });

                  globalSignApi.getStatus(function (err, data) {
                    if (err) {
                      console.log(err);
                    } else {
                      verificationObject = 'Waiting on email verification';
                      createNewSSL(SSLName, verificationMethod, verificationObject, approvers);
                    }
                  });
                }
              }
            });
          }
        });

      } else {
        globalSignApi.sanModifyOperation(SSLName, 'ADDITION', verificationMethod, verificationEmail, verificationWildcard, function (err, data) {
          if (err) {
            console.log(err);
            return reply(boom.badImplementation('Failed addition SSL name ' + SSLName));
          } else {
            console.log(data.output.message);
            //renderJSON(request, reply, err, data.output.message);

            //status = data.output.message.Response.OrderResponseHeader.SuccessCode;
            if (verificationMethod === 'url') {
              verificationObject = data.output.message.Response.CloudOVSANInfo.MetaTag;
            } else {
              verificationObject = data.output.message.Response.CloudOVSANInfo.TxtRecord;
            }

            createNewSSL(SSLName, verificationMethod, verificationObject, approvers);
          }
        });
      }

    }
  });

};

exports.verifySSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }

    // TODO add a permissions check for new account_id
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
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

exports.deleteSSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;

  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }
    /*
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }
    */

    var response = publicRecordFields.handle(result, 'sslName');
    response.deleted = true;
    response.deleted_at = new Date();
    response.deleted_by = utils.generateCreatedByField(request);

    if (response.verified === true) {
      globalSignApi.sanModifyOperation(sslNameId, 'DELETE', response.verification_method, response.verification_object, false, function (err, data) {
        if (err) {
          console.log(err);
          return reply(boom.badImplementation('Failed to retrieve approve for SSL name ID ' + sslNameId));
        } else {
          console.log(data.output.message);
          renderJSON(request, reply, err, data.output.message);
        }
      });
    } else {
      globalSignApi.sanModifyOperation(sslNameId, 'CANCEL', response.verification_method, response.verification_object, false, function (err, data) {
        if (err) {
          console.log(err);
          return reply(boom.badImplementation('Failed to retrieve approve for SSL name ID ' + sslNameId));
        } else {
          console.log(data.output.message);
          renderJSON(request, reply, err, data.output.message);
        }
      });
    }
/*
    sslNames.update(response,function (error, resoult) {
      if (error) {
      return reply(boom.badImplementation('Failed to update details for SSL name ID ' + sslNameId));
      }
      //renderJSON(request, reply, error, resoult);

      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully deleted',
          object_id: result._id
        };
      }
      renderJSON(request, reply, error, statusResponse);

    })

*/
    //renderJSON(request, reply, error, response);
  });

  /*
  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId));
    }

    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
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


  });*/
};

/*
exports.getSSLCerts = function (request, reply) {
  globalSignApi.getStatus(function (err, data) {
    if (err) {
      console.log(err);
      return reply(boom.badImplementation('Failed to receive SSL certificates for SSL name ID ' + sslNameId));
    } else {
      var response = data.output.message.Response.OrderDetail.Fulfillment;
      renderJSON(request, reply, err, response);
    }
  });

};

*/
