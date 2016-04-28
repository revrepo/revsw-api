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
var config      = require('config');
var utils           = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
var _ = require('lodash');

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var SSLConfigurationProfile = require('../models/SSLConfigurationProfile');

var sslConfigurationProfiles = new SSLConfigurationProfile(mongoose, mongoConnection.getConnectionPortal());

exports.listSSLConfigurationProfiles = function(request, reply) {
  sslConfigurationProfiles.list(function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to read from the DB a list of available SSL configuration profiles, error: ' + error));
    }
    var response2 = publicRecordFields.handle(result, 'sslConfigurationProfiles');
    renderJSON(request, reply, error, response2);
  });
};
