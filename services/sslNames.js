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
var utils           = require('../lib/utilities.js');
var publicRecordFields = require('../lib/publicRecordFields');
var boom = require('boom');

var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};

exports.deleteSSLNamesWithAccountId = function(accountId, cb) {
  // найти все SSL Names относящихся к AccountId
  //выполнить обновление над каждым найденным эл-том
  // логирование операций

  var getSSLNamesQuery = {
    account_id: accountId,
    deleted: {
      $ne: true
    }
  };
  sslNames.query(getSSLNamesQuery, function(error, results) {
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

exports.updateIssue = function (request, reply) {
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

            var newPublicCert = X509Cert + CACert;

            // renderJSON(request, reply, err, certs);

            cds_request({
              url: config.get('cds_url') + '/v1/ssl_certs/' + config.get('shared_domain_id'),
              headers: authHeader
            }, function (err, res, body) {
              if (err) {
                return reply(boom.badImplementation('Failed to get from CDS the configuration for SSL certificate ID ' + sslCertId));
              }
              var response_json = JSON.parse(body);
              if (res.statusCode === 400) {
                return reply(boom.badRequest(response_json.message));
              }
              var newSSLCert = publicRecordFields.handle(response_json, 'sslCertificate');
              newSSLCert.updated_by = utils.generateCreatedByField(request);
              newSSLCert.public_ssl_cert = newPublicCert;
              // renderJSON(request, reply, err, newSSLCert);
            });


            if(response){
            cds_request({
              url: config.get('cds_url') + '/v1/ssl_certs/' + newSSLCert.id,
              method: 'PUT',
              headers: authHeader,
              body: JSON.stringify(newSSLCert)
            }, function (err, res, body) {
              if (err) {
                return reply(boom.badImplementation('Failed to update the CDS with confguration for SSL certificate ID ' + newSSLCert.id));
              }
              var response_json = JSON.parse(body);
              if (res.statusCode === 400) {
                return reply(boom.badRequest(response_json.message));
              }

              var response = response_json;

              var result2 = publicRecordFields.handle(newSSLCert, 'sslCertificate');
              result2.private_ssl_key = '<Hidden for security reasons>';
              result2.private_ssl_key_passphrase = '<Hidden for security reasons>';

              renderJSON(request, reply, err, response);

            });
            }
          }
        });
      }
    });
};
