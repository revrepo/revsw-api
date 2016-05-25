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

var _ = require('lodash'),
  utils = require('../lib/utilities.js'),
  config = require('config'),
  mongoose = require('mongoose');
var logger = require('revsw-logger')(config.log_config);

function SSLConfigurationProfile(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.SSLConfigurationProfileSchema = new this.Schema({
    'profile_name': {type: String, required: true},
    'ssl_ciphers': {type: String, required: true},
    'ssl_protocols': {type: String, required: true},
    'ssl_prefer_server_ciphers': {type: Boolean, required: true, default: true},
    'comment': {type: String, default: ''}
  });

  this.model = connection.model('SSLConfigurationProfile', this.SSLConfigurationProfileSchema, 'SSLConfigurationProfile');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));

SSLConfigurationProfile.prototype = {
  get: function (item, callback) {
    this.model.findOne({_id: item, deleted: { $ne: true}}, function (err, _doc) {
      if (err) {
        callback(err);
      }
      var doc = utils.clone(_doc);
      if (doc) {
        delete doc.__v;
        doc.id = doc._id;
        delete doc._id;
      }
      callback(null, doc);
    });
  },
  list: function (callback) {
    this.model.find({}, function (err, domains) {
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
};

module.exports = SSLConfigurationProfile;
