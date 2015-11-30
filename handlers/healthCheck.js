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
var fs       = require('fs');
var config   = require('config');

var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');

var DomainConfig   = require('../models/DomainConfig');
var User     = require('../models/User');
var PurgeJob = require('../models/PurgeJob');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var users     = new User(mongoose, mongoConnection.getConnectionPortal());
var purgeJobs = new PurgeJob(mongoose, mongoConnection.getConnectionPurge());

var version = fs.readFileSync(config.get('version_file'), {
  encoding: 'utf8'
});

exports.healthCheck = function(request, reply) {

  var message = '',
    errorMessage,
    error = false;

  domainConfigs.get('5655668638f201be51900000', function(error, result) {
    if (error) {
      error = true;
      errorMessage = 'ERROR: Failed to retrieve a domain record';
      message = (message === '') ? errorMessage : message + '; ' + errorMessage;
    }
    users.get({
      email: 'test_email_address_which_may_not_exist@revsw.com'
    }, function(error, result) {
      if (error) {
        error = true;
        errorMessage = 'ERROR: Failed to retrieve a user record';
        message = (message === '') ? errorMessage : message + '; ' + errorMessage;
      }
      purgeJobs.get({
        _id: 'purge_job_id_which_may_not_exist'
      }, function(error, result) {
        if (error) {
          error = true;
          errorMessage = 'ERROR: Failed to retrieve a purge job record';
          message = (message === '') ? errorMessage : message + '; ' + errorMessage;
        }

        var statusResponse;
        statusResponse = {
          statusCode: (error) ? 500 : 200,
          version: version.trim(),
          message: (message === '') ? 'Everything is OK' : message
        };

        renderJSON(request, reply, error, statusResponse);
      });
    });
  });
};
