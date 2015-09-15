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

"use strict";

var config   = require('config');
var mongoose = require('mongoose');
var merge    = require('mongoose-merge-plugin');

mongoose.plugin(merge);
mongoose.set('debug', true);

// moungodb connection for store
var purgeJobsConnection = mongoose.createConnection(config.get('purge_mongo.connect_string'));

purgeJobsConnection.on('error', function(err) {
  console.log(['error'], 'Purge moungodb connect error: ' + err);
});

purgeJobsConnection.on('connected', function() {
  console.log('Mongoose connected to purgejobs connection');
});


// moungodb connection for User
var PortalConnection = mongoose.createConnection(config.get('portal_mongo.connect_string'));

PortalConnection.on('error', function(err) {
  console.log(['error'], 'revportal moungodb connect error: ' + err);
});

PortalConnection.on('connected', function() {
  console.log('Mongoose connected to revportal connection');
});

exports.getConnectionPurge = function () {
  return purgeJobsConnection;
};

exports.getConnectionPortal = function () {
  return PortalConnection;
};
