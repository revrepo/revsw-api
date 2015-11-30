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
//	data access layer

var utils = require('../../lib/utilities.js');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var mongoose = require('mongoose');
var autoIncrement = require('revsw-mongoose-auto-increment');

function App(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  var configSchema = mongoose.Schema({
    sdk_release_version: {type: Number},
    logging_level: String, // (“debug”, “info”, “warning”, “error” or “critical”)
    configuration_refresh_interval_sec: {type: Number},
    configuration_stale_timeout_sec: {type: Number},
    operation_mode: String, // (“transfer_and_report”, “transfer_only”, “report_only” or “off”)
    allowed_transport_protocols: [String],
    initial_transport_protocol: String,
    transport_monitoring_url: String,
    stats_reporting_interval_sec: {type: Number},
    stats_reporting_level: String,
    stats_reporting_max_requests_per_report: {type: Number},
    domains_provisioned_list: [String],
    domains_while_list: [String],
    domains_black_list: [String],
    a_b_testing_origin_offload_ratio: {type: Number}
  }, {
    _id: false
  }); // don't create _id fields for subdocuments in the array

  this.AppSchema = new this.Schema({
    app_name: String,
    account_id: String,
    app_platform: String, // (“iOS” or “Android”)
    deleted: {type: Boolean, default: false},
    deleted_at: {type: Date},
    deleted_by: String,
    sdk_key: String,
    created_at: {type: Date, default: Date()},
    updated_at: {type: Date, default: Date()},
    updated_by: String,
    serial_id: {type: Number},
    sdk_configuration_api_service: String,
    sdk_stats_reporting_api_service: String,
    bp_group_id: String,
    configs: [configSchema],
    app_published_version: {type: Number, default: 0},
    last_app_published_version: {type: Number, default: 0},
    previous_app_values: [{}]
  });

  autoIncrement.initialize(connection);
  this.AppSchema.plugin(autoIncrement.plugin, {model: 'App', field: 'serial_id'});
  this.model = connection.model('App', this.AppSchema, 'App');
}

// mongodb connection for the portal database
var PortalConnection = mongoose.createConnection(config.get('portal_mongo.connect_string'));
PortalConnection.on('error', function(err) {
  logger.error('revportal moungodb connect error: ', err);
});

PortalConnection.on('connected', function() {
  logger.info('Mongoose connected to revportal connection');
});

mongoose.set('debug', config.get('mongoose_debug_logging'));

App.prototype = {
  add: function(item, callback) {
    new this.model(item).save(function(err, item) {
      if (item) {
        item = utils.clone(item);
        delete item.__v;
      }
      callback(err, item);
    });
  },
  get: function(item, callback) {
    this.model.findOne(item, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        delete doc.__v;
      }
      callback(err, doc);
    });
  },
  list: function(callback) {
    this.model.find({deleted: {$ne: true}}, function(err, apps) {
      if (apps) {
        apps = utils.clone(apps).map(function(app) {
          delete app.__v;
          return app;
        });
      }
      callback(err, apps);
    });
  },
  update: function(item, callback) {
    this.model.findOne({_id: item._id}, function(err, doc) {
      if (doc) {
        for (var attrname in item) { // update fields with new values
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function(err, item) {
          if (item) {
            item = utils.clone(item);
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },
  remove: function(item, callback) {
    this.model.findOne({_id: item._id}, function(err, doc) {
      if (doc) {
        doc.deleted_at = new Date();
        doc.deleted = true;
        doc.save(function(err, item) {
          if (item) {
            item = utils.clone(item);
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },
};

exports.Apps = new App(mongoose, PortalConnection);
