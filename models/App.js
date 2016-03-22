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

var _ = require('lodash');
var utils = require('../lib/utilities.js');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var mongoose = require('mongoose');

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

  this.model = connection.model('App', this.AppSchema, 'App');
}

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
  getAccountID: function(app_id, callback) {
    this.model.findOne({deleted: 0, _id: app_id}, {_id: 0, account_id: 1}, function(err, doc) {
      if (doc) {
        doc = doc.account_id;
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
  accountList: function(aids, callback) {
    this.model.find({deleted: 0, account_id: { $in: aids }}, {_id: 1}, function(err, apps) {
      if (apps) {
        apps = apps.map(function( a ) {
          return a._id.toString();
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

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },

  // returns _promise_ {
  //    account_id: { total: X, deleted: Y, active: Z },
  //    [account_id: { total: X, deleted: Y, active: Z },
  //    ...]
  //  }

  //  account_id can be array of IDs, one ID(string) or nothing to return data for all accounts
  accountAppsData: function( account_id ) {

    var where = account_id ?
      { account_id: ( _.isArray( account_id ) ? { $in: account_id } : account_id/*string*/ ) } :
      {};

    return this.model.find( where, { _id: 0, account_id: 1, deleted: 1 } )
      .exec(/*mf mongoose*/)
      .then( function( data ) {
        var dist = {};
        data.forEach( function( item ) {
          if ( !dist[item.account_id] ) {
            dist[item.account_id] = { total: 0, deleted: 0, active: 0 };
          }
          if ( item.deleted ) {
            ++dist[item.account_id].deleted;
          } else {
            ++dist[item.account_id].active;
          }
          ++dist[item.account_id].total;
        });
        return dist;
      });
  },


};

module.exports = App;
