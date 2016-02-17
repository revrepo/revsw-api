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
    'domain_name': {type: String},
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


// WTF? DomainConfigSchema missed a lot!
// {
//   "__v" : 1,
//   "_id" : ObjectId("56564344d5833c2d4240115f"),
//   "account_id" : ObjectId("5588869fbde7a0d00338ce8f"),
//   "bp_apache_custom_config" : "",
//   "bp_apache_fe_custom_config" : "",
//   "bp_group_id" : "55a56f85476c10c329a90740",
//   "cname" : "test-proxy-dsa-config.revsw.net.revqa.net",
//   "co_apache_custom_config" : "",
//   "config_command_options" : "  ",
//   "created_at" : ISODate("2015-11-25T23:23:58.989Z"),
//   "created_by" : "victor@revsw.com",
//   "deleted" : false,
//   "domain_name" : "test-proxy-dsa-config.revsw.net",
//   "last_published_domain_version" : 2,
//   "origin_server_location_id" : "5588868cbde7a0d00338ce8e",
//   "previous_domain_configs" : [....lot of weird stuff skipped....],
//   "proxy_config" : {....lot of weird stuff skipped....},
//   "published_domain_version" : 2,
//   "rum_beacon_url" : "https://rum01.revsw.net/service",
//   "serial_id" : 709,
//   "tolerance" : 3000,
//   "updated_at" : ISODate("2015-11-25T23:26:37.713Z")
// }



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
  },

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  }

};

module.exports = DomainConfig;
