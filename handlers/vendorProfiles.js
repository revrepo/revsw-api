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

exports.getVendorProfiles = function getAccounts(request, reply) {
    var vendorProfilesConfig = config.get('vendor_profiles');
    var names = [];

    for(var key in vendorProfilesConfig) {
        names.push(key);
    }

    renderJSON(request, reply, null, names);
};