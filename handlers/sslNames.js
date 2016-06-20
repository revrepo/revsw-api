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
var GlobalSign = require('../lib/globalSignAPI');
var Account = require('../models/Account');
var SSLName = require('../models/SSLName');
var x509 = require('x509');

var cds_request = require('request');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};

var globalSignApi = new GlobalSign();
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

exports.listSSLNames = function (request, reply) {
  // TODO add a permissions check
  sslNames.list(function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve from the DB a list of SSL names', error));
    }

    var response2 = publicRecordFields.handle(result, 'sslNames');
    renderJSON(request, reply, error, response2);
  });

};

exports.getSSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;
  // TODO add a permissions check
  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId, error));
    }
    /*
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }
    */

    if (!result) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    var response = publicRecordFields.handle(result, 'sslName');
    renderJSON(request, reply, error, response);
  });

};

exports.getSSLNameApprovers = function (request, reply) {
  var sslName = request.query.ssl_name;
  var approvers = '';
  // TODO add a permissions check
  globalSignApi.getStatus(function (error, data) {
    if (error) {
      console.log(error);
      return reply(boom.badImplementation('Failed to retrieve status for SSL name ' + sslName, error));
    } else {
      console.log(data.output.message);
      var fqdn = data.output.message.Response.OrderDetail.OrderInfo.DomainName;
      //console.log(fqdn);
      globalSignApi.getApproveList(sslName, fqdn, function (error, data) {
        if (error) {
          console.log(error);
          return reply(boom.badImplementation('Failed to retrieve approve for SSL name ' + sslName, error));
        } else {
          console.log(data.output.message);
          approvers = data.output.message.Response.Approvers[0];
          renderJSON(request, reply, error, approvers);
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
  var created_by = utils.generateCreatedByField(request);
  var approvers = '';
  var verificationObject = '';
  var status;

  function createNewSSLName (accountId, SSLName, created_by, verificationMethod, verificationObject, approvers) {
    var newSSLArray = {
              account_id: accountId,
              ssl_name: SSLName,
              created_by: created_by,
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
                  message: 'Successfully added new SSL name',
                  object_id: result.ssl_name_id
                };
              }
              //result = publicRecordFields.handle(result, 'addSSLName');
              renderJSON(request, reply, error, statusResponse);
            });
  }
  // TODO add a permissions check
  sslNames.getbyname(SSLName, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + SSLName, error));
    }

    if (result) {
      var statusResponse = {
        statusCode: 202,
        message: 'The SSL name is already registered in the system',
        object_id: result.ssl_name_id
      };
      renderJSON(request, reply, error, statusResponse);
    } else {

      if (verificationMethod === 'email') {

        globalSignApi.getStatus(function (error, data) {
          if (error) {
            console.log(error);
            return reply(boom.badImplementation('Failed to retrieve status for SSL name ' + SSLName, error));
          } else {
            console.log(data.output.message);
            var fqdn = data.output.message.Response.OrderDetail.OrderInfo.DomainName;
            //console.log(fqdn);
            globalSignApi.getApproveList(SSLName, fqdn, function (error, data) {
              if (error) {
                console.log(error);
                return reply(boom.badImplementation('Failed to retrieve approve for SSL name ' + SSLName, error));
              } else {
                console.log(data.output.message);
                approvers = data.output.message.Response.Approvers[0];
                if (approvers !== '') {
                  globalSignApi.sanModifyOperation(SSLName, 'ADDITION', verificationMethod, verificationEmail, verificationWildcard, function (error, data) {
                    if (error) {
                      console.log(error);
                      return reply(boom.badImplementation('Failed addition SSL name ' + SSLName, error));
                    } else {
                      console.log(data.output.message);
                      //renderJSON(request, reply, error, data.output.message);
                      status = data.output.message.Response.OrderResponseHeader.SuccessCode;
                    }
                  });

                  verificationObject = 'Waiting on email verification';
                  createNewSSLName(accountId, SSLName, created_by, verificationMethod, verificationObject, approvers);

                }
              }
            });
          }
        });

      } else {
        globalSignApi.sanModifyOperation(SSLName, 'ADDITION', verificationMethod, verificationEmail, verificationWildcard, function (error, data) {
          if (error) {
            console.log(error);
            return reply(boom.badImplementation('Failed addition SSL name ' + SSLName, error));
          } else {
            console.log(data.output.message);
            //renderJSON(request, reply, error, data.output.message);

            //status = data.output.message.Response.OrderResponseHeader.SuccessCode;
            if (verificationMethod === 'url') {
              verificationObject = data.output.message.Response.CloudOVSANInfo.MetaTag;
            } else {
              verificationObject = data.output.message.Response.CloudOVSANInfo.TxtRecord;
            }

            createNewSSLName(accountId, SSLName, created_by, verificationMethod, verificationObject, approvers);
          }
        });
      }

    }
  });

};

exports.verifySSLName = function (request, reply) {

  var sslNameId = request.params.ssl_name_id;

  function setStatusVerified(request, reply, response) {
    var newSSLCert;
    globalSignApi.issueRequest(function (err, data) {
      if (err) {
        console.log(err);
        return reply(boom.badImplementation('Failed to update SSL certificates'));
      } else {
        globalSignApi.getStatus(function (err, data) {
          if (err) {
            console.log(err);
            return reply(boom.badImplementation('Failed to receive SSL certificates'));
          } else {
            var certs = data.output.message.Response.OrderDetail.Fulfillment;
            var CACert = certs.CACertificates.CACertificate[1].CACert;
            var X509Cert = certs.ServerCertificate.X509Cert;

            var newPublicCert = X509Cert + '\r\n' + CACert;

            var altNames = x509.getAltNames(newPublicCert);
            //console.log(altNames);


            var domains = data.output.message.Response.OrderDetail.CloudOVSANInfo.CloudOVSANDetail;

            for (var i = 0; domains.length > i; i += 1) {
              if (domains[i].CloudOVSANStatus === '2' || domains[i].CloudOVSANStatus === '3') {
                if (altNames.indexOf(domains[i].CloudOVSAN) < 0) {
                  return reply('Failed to validate shared SSL certificate');
                }
              }
            }

            cds_request({
              url: config.get('cds_url') + '/v1/ssl_certs/' + config.get('shared_ssl_cert_id'),
              headers: authHeader
            }, function (err, res, body) {
              if (err) {
                return reply(boom.badImplementation('Failed to get from CDS the configuration for SSL certificate ID ' + sslNameId));
              }
              var responseJson = JSON.parse(body);
              if (res.statusCode === 400) {
                return reply(boom.badRequest(responseJson.message));
              }

              newSSLCert = {
                'account_id': responseJson.account_id,
                'bp_group_id': responseJson.bp_group_id,
                'cert_name': responseJson.cert_name,
                'cert_type': responseJson.cert_type,
                'comment': responseJson.account_id,
                'public_ssl_cert': newPublicCert,
                'private_ssl_key': responseJson.private_ssl_key,
                'private_ssl_key_passphrase': responseJson.private_ssl_key_passphrase,
                'chain_ssl_cert': responseJson.chain_ssl_cert,
                'updated_by': utils.generateCreatedByField(request)
              };
              // renderJSON(request, reply, err, newSSLCert);

              cds_request({
                url: config.get('cds_url') + '/v1/ssl_certs/' + responseJson.id + '?options=publish',
                method: 'PUT',
                headers: authHeader,
                body: JSON.stringify(newSSLCert)
              }, function (err, res, body) {
                if (err) {
                  return reply(boom.badImplementation('Failed to update the CDS with confguration for shared SSL certificate'));
                }
                var responseJson = JSON.parse(body);
                if (res.statusCode === 400) {
                  return reply(boom.badRequest(responseJson.message));
                }
                /*
                 var response = responseJson;
                 if (response) {
                 var statusResponse = {
                 statusCode: 202,
                 message: 'Successfully saved the updated SSL certificate',
                 object_id: response.ssl_name_id
                 };
                 renderJSON(request, reply, err, statusResponse);
                 }
                 */
                response.published = true;

                sslNames.update(response, function (error, resoult) {
                  if (error) {
                    return reply(boom.badImplementation('Failed to update details for SSL name ID ' + sslNameId));
                  }

                  var statusResponse;
                  if (resoult) {
                    statusResponse = {
                      statusCode: 200,
                      message: 'Successfully verified',
                      object_id: resoult._id
                    };
                  }
                  renderJSON(request, reply, error, statusResponse);
                });
              });
            });
          }
        });
      }
    });

  }

  sslNames.get(sslNameId, function (error, resoult) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId, error));
    }

    // TODO add a permissions check
    if (!resoult) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    //console.log(resoult.verification_method);

    if(resoult.verification_method === 'email'){
      globalSignApi.getStatus(function (error, data) {
        if (error) {
          console.log(error);
        } else {
          var domain;
          var domains = data.output.message.Response.OrderDetail.CloudOVSANInfo.CloudOVSANDetail;
          //console.log(JSON.stringify(domains));
          for (var i = 0; domains.length > i; i += 1) {
            if (domains[i].CloudOVSAN === resoult.ssl_name) {
              if(domains[i].CloudOVSANStatus !== '8' && domains[i].CloudOVSANStatus !== '9'){
                domain = domains[i];
              }
            }
          }
          //renderJSON(request, reply, error, globalSignApi.sanStatusCode[domain.CloudOVSANStatus]);
          console.log(domain.CloudOVSANStatus);
          if (domain.CloudOVSANStatus === '2' || domain.CloudOVSANStatus === '3') {
            resoult.verified = true;
            setStatusVerified(request, reply, resoult);
          } else {
            var statusResponse;
            if (resoult) {
              statusResponse = {
                statusCode: 200,
                message: globalSignApi.sanStatusCode[domain.CloudOVSANStatus],
                object_id: resoult.ssl_name_id
              };
            }
            renderJSON(request, reply, error, statusResponse);
          }
        }
      });
    } else if (resoult.verification_method === 'url') {

      globalSignApi.urlVerification(resoult.ssl_name, function (error, data) {
        if (error) {
          console.log(error);
        } else {
          /*
           var statusResponse;
           if (resoult) {
           statusResponse = {
           statusCode: 200,
           message: globalSignApi.sanStatusCode[domain.CloudOVSANStatus],
           object_id: resoult.ssl_name_id
           };
           }*/
          renderJSON(request, reply, error, data);
        }
      });

    } else if (resoult.verification_method === 'dns') {

      globalSignApi.dnsVerification(resoult.ssl_name, function (error, data) {
        if (error) {
          console.log(error);
        } else {
          /*
           var statusResponse;
           if (resoult) {
           statusResponse = {
           statusCode: 200,
           message: globalSignApi.sanStatusCode[domain.CloudOVSANStatus],
           object_id: resoult.ssl_name_id
           };
           }*/
          renderJSON(request, reply, error, data);
        }
      });
    } else {
      return reply(boom.badImplementation('Failed to verify for SSL name ID ' + sslNameId, error));
    }

    /*
    if (!resoult || !utils.checkUserAccessPermissionToSSLName(request, resoult)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

     newLogJob.updated_by = utils.generateCreatedByField(request);

     logShippingJobs.update(newLogJob, function (error, resoult) {
     if (error) {
     return reply(boom.badImplementation('Failed to update the DB for log shipping job ID ' + logJobId));
     }

     var result2 = publicRecordFields.handle(resoult, 'LogShippingJob');
     result2.destination_key = '<Hidden for security reasons>';
     result2.destination_password = '<Hidden for security reasons>';

     AuditLogger.store({
     account_id       : resoult.account_id,
     activity_type    : 'modify',
     activity_target  : 'logshippingjob',
     target_id        : logJobId,
     target_name      : resoult.job_name,
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
  // TODO add a permissions check
  sslNames.get(sslNameId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for SSL name ID ' + sslNameId, error));
    }
    /*
    if (!result || !utils.checkUserAccessPermissionToSSLName(request, result)) {
      return reply(boom.badRequest('SSL name ID not found'));
    }
    */

    if (!result) {
      return reply(boom.badRequest('SSL name ID not found'));
    }

    var response = publicRecordFields.handle(result, 'sslName');
    response.deleted = true;
    response.deleted_at = new Date();
    response.deleted_by = utils.generateCreatedByField(request);

    if (response.verified === true) {
      globalSignApi.sanModifyOperation(response.ssl_name, 'DELETE', response.verification_method, response.verification_object, false, function (error, data) {
        if (error) {
          console.log(error);
          return reply(boom.badImplementation('Failed to retrieve approve for SSL name ID ' + sslNameId, error));
        } else {
          console.log(data.output.message);
          //renderJSON(request, reply, error, data.output.message);
        }
      });
    } else {
      globalSignApi.sanModifyOperation(response.ssl_name, 'CANCEL', response.verification_method, response.verification_object, false, function (error, data) {
        if (error) {
          console.log(error);
          return reply(boom.badImplementation('Failed to retrieve approve for SSL name ID ' + sslNameId, error));
        } else {
          console.log(data.output.message);
          //renderJSON(request, reply, error, data.output.message);
        }
      });
    }

    sslNames.update(response,function (error, resoult) {
      if (error) {
      return reply(boom.badImplementation('Failed to update details for SSL name ID ' + sslNameId));
      }

      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully deleted',
          object_id: result._id
        };
      }
      renderJSON(request, reply, error, statusResponse);

    });

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
