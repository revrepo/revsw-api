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

var fs = require('fs'),
  path = require('path'),
  hapi = require('hapi'),
  boom = require('boom'),
  joi = require('joi'),
  config = require('config'),
  mongoose = require('mongoose'),
  merge = require('mongoose-merge-plugin'),
  PurgeJob = require('../lib/purgejobs.js').PurgeJob,
  User = require('../lib/user.js').User,
  Domain = require('../lib/domain.js').Domain,
  Account = require('../lib/account.js').Account,
  ServerGroup = require('../lib/servergroup.js').ServerGroup,
  AuditEvents = require('./models/auditevents.js').AuditEvents,
  MasterConfiguration = require('../lib/masterconfiguration.js').MasterConfiguration,
  utils = require('../lib/utilities.js'),
  crypto = require('crypto'),
  uuid = require('node-uuid'),
  async = require('async'),
  nodemailer = require('nodemailer'),
  portal_request = require('supertest'),
  jwt = require('jsonwebtoken'),
  pack = require('../package'),
  AuditLogger = require('revsw-audit');



require('datejs');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: config.get('elasticsearch_url'),
  requestTimeout: 60000,
  log: 'trace'
});

// moungodb connection for store
var purgeJobsConnection = mongoose.createConnection(config.get('purge_mongo.connect_string')),
  purgeJobs = new PurgeJob(mongoose, purgeJobsConnection);
purgeJobsConnection.on('error', function(err) {
  console.log(['error'], 'Purge moungodb connect error: ' + err);
});
purgeJobsConnection.on('connected', function() {
  console.log('Mongoose connected to purgejobs connection');
});


// moungodb connection for User
var PortalConnection = mongoose.createConnection(config.get('portal_mongo.connect_string')),
  users = new User(mongoose, PortalConnection);
PortalConnection.on('error', function(err) {
  console.log(['error'], 'revportal moungodb connect error: ' + err);
});
PortalConnection.on('connected', function() {
  console.log('Mongoose connected to revportal connection');
});

var domains = new Domain(mongoose, PortalConnection);
var accounts = new Account(mongoose, PortalConnection);
var masterconfigurations = new MasterConfiguration(mongoose, PortalConnection);
var servergroups = new ServerGroup(mongoose, PortalConnection);
var auditevents = new AuditEvents(mongoose, PortalConnection);


/* ----------------------------------------------------------------------------------- */















/* ----------------------------------------------------------------------------------- */


exports.index = index;
exports.reduced = reduced;
exports.license = license;

exports.purgeObject = purgeObject;
exports.getPurgeJobStatus = getPurgeJobStatus;
