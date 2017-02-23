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
var async = require('async');
var utils = require('../lib/utilities.js');
var moment = require('moment');
var _ = require('lodash');
var config = require('config');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var Account = require('../models/Account');
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

exports.getVendorProfiles = function getAccounts(request, reply) {
    var vendorProfilesConfig = config.get('vendor_profiles');
    var names = [];

    for(var key in vendorProfilesConfig) {
        names.push(key);
    }

    renderJSON(request, reply, null, names);
};

exports.getVendorProfile = function getAccounts(request, reply) {
  var vendorUrl = request.params.vendorUrl;
  var vendorProfiles = config.get('vendor_profiles');
  var systemVendor = config.get('default_system_vendor_profile');
  var result = vendorProfiles[systemVendor];
  var vendorName = '';

  for(var vendorKey in vendorProfiles) {
    var vendorConfig = vendorProfiles[vendorKey];

    if (vendorConfig.vendorUrl === vendorUrl) {
      result = vendorConfig;
      vendorName = vendorKey;
      continue;
    }
  }

  result = publicRecordFields.handle(result, 'vendorProfiles');
  result.vendor = vendorName || systemVendor;

  renderJSON(request, reply, null, result);
};

exports.getVendorProfileByName = function getAccounts(request, reply) {
  var vendor = request.params.vendor;
  var vendorProfiles = config.get('vendor_profiles');
  var result = vendorProfiles[vendor];

  result = publicRecordFields.handle(result, 'vendorProfiles');

  renderJSON(request, reply, null, result);
};

exports.updateAccountVendor = function getAccounts(request, reply) {
  var account_id = request.params.account_id;
  var vendor_profile = request.payload.vendor_profile;

  accounts.get({
    _id: account_id
  }, function(error, account) {
    if (error) {
      return reply(boom.badImplementation('Failed to read details for account ID ' + account_id, error));
    }

    if (!account || !utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    var updateParams = {
      account_id: account_id,
      vendor_profile: vendor_profile
    };

    accounts.update(updateParams, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account', error));
      }

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the account vendor'
      };

      renderJSON(request, reply, error, statusResponse);
    });
  });
};
