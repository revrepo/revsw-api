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

var _ = require('lodash');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');
var AuditLogger = require('../lib/audit');

var mongoConnection = require('../lib/mongoConnections');
var SSLName = require('../models/SSLName');
var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

var GlobalSign = require('../lib/globalSignAPI');
var globalSignApi = new GlobalSign();
var renderJSON = require('../lib/renderJSON');
var cdsRequest = require('request');
var utils = require('../lib/utilities.js');
var publicRecordFields = require('../lib/publicRecordFields');
var boom = require('boom');
var x509 = require('x509');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
var schedule = require('node-schedule');

exports.deleteSSLNamesWithAccountId = function (accountId, cb) {

  var getSSLNamesQuery = {
    account_id: accountId,
    deleted: {
      $ne: true
    }
  };
  sslNames.query(getSSLNamesQuery, function (error, results) {
    if (error) {
      cb(error);
    } else {
      if (results) {
        // TODO: update all records
        cb(null, results);
      } else {
        cb(null, []);
      }
    }
  });
};

if (config.get('enable_shared_ssl_regeneration_scheduler') === true) {
  logger.info('Starting shared SSL cert regeneration scheduler');
  var updateIssue = schedule.scheduleJob(config.get('shared_ssl_regeneration_scheduler_period'), function () {
    var unpublished = [];
    var newSSLCert;

    sslNames.list(function (error, result) {
      if (error) {
        logger.error('Failed to retrieve from the DB a list of SSL names');
        return false;
      }
      for (var i = 0; result.length > i; i += 1) {
        if (result[i].verified === true && result[i].published !== true) {
          unpublished.push(result[i]);
        }
      }

      if (unpublished.length > 0) {
        logger.info('Found ' + unpublished.length + ' verified but not yet published SSL names - starting ' +
          'the shared SSL certificate regeneration and publishing process...');
        globalSignApi.issueRequest(function (err, data) {
          if (err) {
            logger.error('Failed to issue a new shared SSL certificate - GS error: ', err);
            return false;
          } else {
            globalSignApi.getStatus(function (err, data) {
              if (err) {
                logger.error('Failed to receive SSL certificate status - GS error: ', err);
                return false;
              } else {
                var certs = data.output.message.Response.OrderDetail.Fulfillment;
                var CACert = certs.CACertificates.CACertificate[1].CACert;
                var X509Cert = certs.ServerCertificate.X509Cert;
                var newPublicCert = X509Cert + '\r\n' + CACert;
                var altNames = x509.getAltNames(newPublicCert);
                var domains = data.output.message.Response.OrderDetail.CloudOVSANInfo.CloudOVSANDetail;

                logger.info('Checking that the new shared SSL cert includes all new approved SSL names...');
                for (var i = 0; domains.length > i; i += 1) {
                  if (domains[i].CloudOVSANStatus === '2' || domains[i].CloudOVSANStatus === '3') {
                    if (altNames.indexOf(domains[i].CloudOVSAN) < 0) {
                      logger.error('It looks like the new shared SSL cert does not include new SSL name ' + domains[i].CloudOVSAN +
                        ': aborting the publishing process');
                      return false;
                    }
                  }
                }

                logger.info('Calling CDS to deploy a new shared SSL cert with ID ' + config.get('shared_ssl_cert_id'));
                cdsRequest({
                  url: config.get('cds_url') + '/v1/ssl_certs/' + config.get('shared_ssl_cert_id'),
                  headers: authHeader
                }, function (err, res, body) {
                  if (err) {
                    logger.error('Failed to get from CDS the configuration for shared SSL certificate');
                    return false;
                  }
                  var responseJson = JSON.parse(body);
                  if (res.statusCode === 400) {
                    logger.error(responseJson.message);
                    return false;
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
                    'updated_by': 'API scheduler'
                  };
                  // renderJSON(request, reply, err, newSSLCert);

                  cdsRequest({
                    url: config.get('cds_url') + '/v1/ssl_certs/' + responseJson.id + '?options=publish',
                    method: 'PUT',
                    headers: authHeader,
                    body: JSON.stringify(newSSLCert)
                  }, function (err, res, body) {
                    if (err) {
                      logger.error('Failed to update the CDS with confguration for shared SSL certificate');
                      return false;
                    }
                    var responseJson = JSON.parse(body);
                    if (res.statusCode === 400) {
                      logger.error(responseJson.message);
                      return false;
                    }

                    function updateSSL(data) {
                      sslNames.update(data, function (error, result) {
                        if (error) {
                          logger.error('Failed to published details for SSL name ID ' + result.ssl_name);
                          return false;
                        }

                        var result_ = publicRecordFields.handle(result, 'sslName');
                        AuditLogger.store({  // TODO in the current format the 'Publish' audit record is not
                            // visible to user who added the domain - need to refactor this
                          ip_address: '127.0.0.1',
                          user_id: 'xxxxxxxxxxxxxxxxxxxxxxxx',
                          user_name: 'Internal Scheduler',
                          user_type: 'user',
                          account_id: result_.account_id,
                          activity_type: 'publish',
                          activity_target: 'sslname',
                          target_id: result_.id,
                          target_name: result_.ssl_name,
                          target_object: publicRecordFields.handle(result_, 'sslName'),
                          operation_status: 'success'
                        });

                        logger.info('Completed the publishing process for new SSL name ' + result.ssl_name);
                      });
                    }

                    if (responseJson) {
                      for (var i = 0; unpublished.length > i; i += 1) {
                        unpublished[i].published = true;
                        updateSSL(unpublished[i]);
                      }
                    }
                  });
                });
              }
            });
          }
        });
      } else {
        logger.info('Could not find any approved but unpublished SSL names');
      }
    });
  });
} else {
  logger.info('Shared SSL cert regeneration scheduler is disabled');
}
