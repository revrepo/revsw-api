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

var utils = require('../lib/utilities.js'),
  config = require('config'),
  mongoose = require('mongoose');

function DomainConfig(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.DomainConfigSchema = new this.Schema({
    'name': {type: String, required: true},
    'BPGroup': {type: String, required: true},
    'COGroup': {type: String},
    'bp_apache_custom_config': {type: String},
    'bp_apache_fe_custom_config': {type: String},
    'co_apache_custom_config': {type: String},
    'co_cnames': {type: String},
    'account_id': {type: this.ObjectId},
    'config_command_options': {type: String},
    'tolerance': {type: Number},
    'rum_beacon_url': {type: String},
    'updated_at': {type: Date, default: Date()},
    'created_at': {type: Date, default: Date()},
    'created_by': {type: String},
    'deleted': {type: Boolean, default: false},
    'deleted_at': {type: Date},
    'deleted_by': {type: String},
    'operation': {type: String},
    'proxy_config': {},
    'published_domain_version': {type: Number, default: 0},
    'previous_domain_configs': [{}],
  });

  this.model = connection.model('DomainConfig', this.DomainConfigSchema, 'DomainConfig');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));


DomainConfig.prototype = {

  get: function (item, callback) {
    this.model.findOne({_id: item, deleted: { $ne: true}}, function (err, _doc) {
      if (err) {
        callback(err);
      }
      var doc = utils.clone(_doc);
      callback(null, doc);
    });
  },
  query: function (where, callback) {
    if (!where || typeof (where) !== 'object') {
      callback(new Error('where clause not specified'));
    }
    this.model.find(where, function (err, doc) {
      if (err) {
        callback(err);
      }
      if (doc) {
        doc = utils.clone(doc).map(function (r) {
          delete r.__v;
          return r;
        });
      }
      callback(null, doc);
    });
  },
  list: function (callback) {
    this.model.find({deleted: { $ne: true }}, function (err, domains) {
      if (err) {
        callback(err, null);
      }
      var results = domains.map(function (r) {
        delete r.__v;
        return r;
      });
      callback(err, results);
    });
  }
};

module.exports = DomainConfig;
