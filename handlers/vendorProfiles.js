/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var permissionCheck = require('./../lib/requestPermissionScope');

exports.getVendorProfiles = function(request, reply) {
    var vendorProfilesConfig = config.get('vendor_profiles');
    var names = [];

    for(var key in vendorProfilesConfig) {
        names.push(key);
    }

    renderJSON(request, reply, null, names);
};

exports.getVendorProfile = function(request, reply) {
  var vendorUrl = request.params.vendorUrl;
  var vendorProfiles = config.get('vendor_profiles');
  var systemVendor = config.get('default_system_vendor_profile');
  var result = vendorProfiles[systemVendor];
  var vendorName = '';

  for(var vendorKey in vendorProfiles) {
    var vendorConfig = vendorProfiles[vendorKey];

    if (vendorConfig.vendorUrl === vendorUrl || vendorConfig.apiUrl === vendorUrl) {
      result = vendorConfig;
      vendorName = vendorKey;
      continue;
    }
  }

  result = publicRecordFields.handle(result, 'vendorProfiles');
  result.vendor = vendorName || systemVendor;

  renderJSON(request, reply, null, result);
};
/**
 * @name getVendorProfileByName
 * @description find Vendor Profile use name
 *
 * @param {*} request
 * @param {*} reply
 */
exports.getVendorProfileByName = function(request, reply) {
  var vendor = request.params.vendor;
  var vendorProfiles = config.get('vendor_profiles');
  var result = vendorProfiles[vendor];
  if(!result) {
    return reply(boom.badRequest('Vendor profile not found'));
  }
  result = publicRecordFields.handle(result, 'vendorProfiles');

  renderJSON(request, reply, null, result);
};

exports.updateAccountVendor = function(request, reply) {
  var account_id = request.params.account_id;
  var vendor_profile = request.payload.vendor_profile;
  var vendorProfiles = config.get('vendor_profiles');

  if (!vendorProfiles[vendor_profile]) {
    return reply(boom.badRequest('Vendor profile not found'));
  }


  accounts.get({
    _id: account_id
  }, function(error, account) {
    if (error) {
      return reply(boom.badImplementation('Failed to read details for account ID ' + account_id, error));
    }

    if (!account || !permissionCheck.checkPermissionsToResource(request, {id: account_id}, 'accounts')) {
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
