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
//	data access layer

var _ = require('lodash');
var utils = require('../lib/utilities.js');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var mongoose = require('mongoose');
// NOTE: default data about # of Mobile apps per platform
var APP_PER_PLATFORMS_DEFAULT_DATA_OBJECT = {
  Windows_Mobile: {
    total: 0,
    active: 0,
    deleted: 0
  },
  Android: {
    total: 0,
    active: 0,
    deleted: 0
  },
  iOS: {
    total: 0,
    active: 0,
    deleted: 0
  }
};
function App(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  var configSchema = mongoose.Schema({
    sdk_release_version: {type: Number},
    // TODO add allowed logging levels
    logging_level: String, // (“debug”, “info”, “warning”, “error” or “critical”)
    configuration_refresh_interval_sec: {type: Number},
    configuration_stale_timeout_sec: {type: Number},
    // TODO add allowed operation modes
    operation_mode: String, // (“transfer_and_report”, “transfer_only”, “report_only” or “off”)
    allowed_transport_protocols: [String],
    initial_transport_protocol: String,
    transport_monitoring_url: String,
    stats_reporting_interval_sec: {type: Number},
    stats_reporting_level: String,
    stats_reporting_max_requests_per_report: {type: Number},
    domains_provisioned_list: [String],
    domains_white_list: [String],
    domains_black_list: [String],
    a_b_testing_origin_offload_ratio: {type: Number}
  }, {
    _id: false
  }); // don't create _id fields for subdocuments in the array

  this.AppSchema = new this.Schema({
    app_name: String,
    account_id: String,
    // TODO add allowed app platforms
    app_platform: String, // (“iOS” or “Android” or "Windows_Mobile")
    deleted: {type: Boolean, default: false},
    deleted_at: {type: Date, default : null},
    deleted_by: String,
    sdk_key: String,
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
    updated_by: String,
    serial_id: {type: Number},
    sdk_configuration_api_service: String,
    sdk_stats_reporting_api_service: String,
    bp_group_id: String,
    configs: [configSchema],
    app_published_version: {type: Number, default: 0},
    last_app_published_version: {type: Number, default: 0},
    previous_app_values: [{}],
    comment: {type: String, default: ''},
  });

  this.model = connection.model('App', this.AppSchema, 'App');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));

App.prototype = {  
  get: function(item, callback) {
    this.model.findOne(item, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        delete doc.__v;
      }
      callback(err, doc);
    });
  },
  getAccountID: function(app_id, callback) {
    this.model.findOne({deleted: false, _id: app_id}, {_id: 0, account_id: 1}, function(err, doc) {
      if (doc) {
        doc = doc.account_id;
      }
      callback(err, doc);
    });
  },
  accountList: function(aids, callback) {
    this.model.find({deleted: 0, account_id: { $in: aids }}, {_id: 1}, function(err, apps) {
      if (apps) {
        apps = apps.map(function( a ) {
          return a._id.toString();
        });
      }
      callback(err, apps);
    });
  } 
};

module.exports = App;
