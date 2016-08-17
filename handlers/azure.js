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

var boom = require('boom');
var mongoose = require('mongoose');
var AuditLogger = require('../lib/audit');
var config = require('config');
var Promise = require('bluebird');

var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var User = require('../models/User');
var Account = require('../models/Account');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));

exports.createSubscription = function (request, reply) {

  var subscription = request.payload,
    subscriptionId = request.params.subscription_id;

  var error;

  renderJSON(request, reply, error, subscription);
};

exports.createUpdateResource = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.patchResource = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.listAllResourcesInResourceGroup = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.listAllResourcesInSubscription = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.getResource = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.deleteResource = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.listSecrets = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.listOperations = function (request, reply) {

  var resource = request.payload;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.updateCommunicationPreference = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.listCommunicationPreference = function (request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.regenerateKey = function (request, reply) {


  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  var error;

  renderJSON(request, reply, error, resource);
};
