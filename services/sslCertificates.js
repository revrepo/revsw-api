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
var utils = require('../lib/utilities.js');
var async = require('async');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');

var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var SSLCertificate = require('../models/SSLCertificate');
var sslCertificates = new SSLCertificate(mongoose, mongoConnection.getConnectionPortal());

var cds_request = require('request');

var authHeader = {
  Authorization: 'Bearer ' + config.get('cds_api_token')
};
/**
 * @name deletePrivateSSLCertificatesWithAccountId
 * @description
 *
 * @param  {[type]}   accountId [description]
 * @param  {[type]}   options   [description]
 * @param  {Function} cb        [description]
 * @return {[type]}             [description]
 */
exports.deletePrivateSSLCertificatesWithAccountId = function(accountId, options, cb) {
  var getPrivateSSLCertificatesQuery = {
    account_id: accountId,
    cert_type: 'private',
    deleted: {
      $ne: true
    }
  };
  var deleted_by = options.deleted_by;
  sslCertificates.query(getPrivateSSLCertificatesQuery, function(error, results) {
    if (error) {
      cb(error);
    } else {
      if (results) {
        var callCDS = [];
        _.forEach(results, function(item) {
          callCDS.push(function(cb) {
            return (function(item, cb) {
              return deleteSSLCertificateCDS(item, cb);
            })(item, cb);
          });
        });
        // NOTE: async call CDS for delete SSL Certificate
        async.parallel(callCDS, function(err, data) {
          cb(err, data);
        });

      } else {
        cb(null, []);
      }
    }
  });

  /**
   * @name deleteSSLCertificateCDS
   * @description
   *
   * @param  {[type]}   data     [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  function deleteSSLCertificateCDS(data, callback) {
    var sslCertId = data._id;
    logger.info('Calling CDS to delete SSL certificate ID ' + sslCertId + ' deleted_by ' + deleted_by);

    cds_request({
      url: config.get('cds_url') + '/v1/ssl_certs/' + sslCertId + '?deleted_by="' + deleted_by + '"',
      method: 'DELETE',
      headers: authHeader,
    }, function(err, res, body) {
      if (err) {
        logger.error('Failed to send a CDS command to delete SSL certificate ID ' + sslCertId);
        callback(err);
      } else {
        var response_json = JSON.parse(body);
        if (res.statusCode === 400) {
          return callback(true, null);
        } else {
          callback(null, data._id);
        }
      }

    });
  }
};
