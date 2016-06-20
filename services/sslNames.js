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

var mongoConnection = require('../lib/mongoConnections');
var SSLName = require('../models/SSLName');
var sslNames = new SSLName(mongoose, mongoConnection.getConnectionPortal());

var GlobalSign = require('../lib/globalSignAPI');
var globalSignApi = new GlobalSign();
var renderJSON = require('../lib/renderJSON');
var cds_request = require('request');
var utils = require('../lib/utilities.js');
var publicRecordFields = require('../lib/publicRecordFields');
var boom = require('boom');
var x509 = require('x509');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
var schedule = require('node-schedule');

exports.deleteSSLNamesWithAccountId = function (accountId, cb) {
  // найти все SSL Names относящихся к AccountId
  //выполнить обновление над каждым найденным эл-том
  // логирование операций

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
  var updateIssue = schedule.scheduleJob(config.get('shared_ssl_regeneration_scheduler_period'), function () {
    var unpublished = [];
    var newSSLCert;

    sslNames.list(function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve from the DB a list of SSL names', error));
      }
      for (var i = 0; result.length > i; i += 1) {
        if (result[i].verified === true && result[i].published !== true) {
          unpublished.push(result[i]);
        }
        //unpublished.push(result[i]);
      }

      /*
       for (var i = 0; unpublished.length > i; i += 1) {
       unpublished[i].published = false;
       sslNames.update(unpublished[i], function (error, resoult) {
       if (error) {
       return reply(boom.badImplementation('Failed to published details for SSL name ID ' + resoult.ssl_name));
       }
       console.log('Published ' + resoult.ssl_name)
       });
       console.log(unpublished[i]);
       }
       */
      if (unpublished.length > 0) {
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
                var domains = data.output.message.Response.OrderDetail.CloudOVSANInfo.CloudOVSANDetail;

                for (var i = 0; domains.length > i; i += 1) {
                  if (domains[i].CloudOVSANStatus === '2' || domains[i].CloudOVSANStatus === '3') {
                    if (altNames.indexOf(domains[i].CloudOVSAN) < 0) {
                      return reply('Failed to validate SSL certificates');
                    }
                  }
                }

                cds_request({
                  url: config.get('cds_url') + '/v1/ssl_certs/' + config.get('shared_ssl_cert_id'),
                  headers: authHeader
                }, function (err, res, body) {
                  if (err) {
                    return reply(boom.badImplementation('Failed to get from CDS the configuration for SSL certificate ID ' + sslCertId));
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
                    'updated_by': 'API scheduler'
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


                    if (responseJson) {
                      for (var i = 0; unpublished.length > i; i += 1) {
                        unpublished[i].published = true;
                        sslNames.update(unpublished[i], function (error, resoult) {
                          if (error) {
                            return reply(boom.badImplementation('Failed to published details for SSL name ID ' + resoult.ssl_name));
                          }
                          console.log('Published ' + resoult.ssl_name)
                        });
                      }
                    }
                  });
                });
              }
            });
          }
        });
      } else {
        console.log('Unpublished domains not found.')
      }

    });
  });
}
