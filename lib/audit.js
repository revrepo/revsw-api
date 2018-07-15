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

var _       = require('lodash');
var Winston = require('winston');
var MongoDB = require('winston-mongodb').MongoDB;
var Schema  = require('./audit-schema');
var Joi     = require('joi');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var utils = require('../lib/utilities.js');
var autidNotification = require('./audit-notification');
/**
 *
 * @constructor
 */
var AuditLogger = {};

/**
 * @param {object} object
 */
AuditLogger.init = function (object) {
  var mongodbRequiredKeys = ['db', 'collection'];
  var fileRequiredKeys    = ['filename', 'timestamp'];

  if (
    !_.has(object, 'mongodb') ||
    !_.has(object, 'file') ||
    !_.every(mongodbRequiredKeys, _.partial(_.has, object.mongodb)) ||
    !_.every(fileRequiredKeys,    _.partial(_.has, object.file))
  ) {

    logger.error('AuditLogger:: Incorrect configuration. Please see README.md');
    return false;
  }

  if (!AuditLogger._addTransport(object)) {
    return false;
  }
  return true;
};

/**
 *
 * @param {object} object
 * @private
 */
AuditLogger._addTransport = function (object) {
  try {
    Winston.add(MongoDB, {
      db         : object.mongodb.db,
      collection : object.mongodb.collection
    });

    Winston.add(Winston.transports.File, {
      timestamp : object.file.timestamp,
      filename  : object.file.filename,
    });

  } catch (e) {
    console.log('Add transport error:', e);
    return false;
  }

  return true;
};

/**
 *
 * @param {object} object
 */
AuditLogger.store = function (object, request) {
//  if (!_.isArray(object.domain_id)) {
//    object.domain_id = [object.domain_id];
//  }
//  if (!_.isArray(object.account_id)) {
//    object.account_id = [object.account_id];
//  }

  // Set datetime
  object.datetime = object.datetime || Date.now();

  // check if request is presented set values from it
  if(request){
    object.ip_address = object.ip_address || utils.getAPIUserRealIP(request);
    object.user_id = object.user_id || (request.auth.credentials.user_id || request.auth.credentials.id);
    object.user_name = object.user_name || utils.generateCreatedByField(request);
    object.user_type = object.user_type || request.auth.credentials.user_type;
    object.account_id = object.account_id || request.auth.credentials.account_id;
  }

  Joi.validate(object, Schema.options, function (err, value) {
    if (err) {
      console.log(err);
      return false;
    }
    // NOTE: Send audit information to externals services
    autidNotification.sendAuditEmail(object,function(err,message){
      if(err){
         console.log('autidNotification.sendAuditEmail', err.message);
      }
    });
    Winston.info(object);
  });
};

module.exports = AuditLogger;
