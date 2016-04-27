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


function SSLCertificate(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.SSLCertificateSchema = new this.Schema({
    'cert_name': {type: String, required: true},
    'cert_type': {type: String, required: true},
    'account_id': {type: this.ObjectId, required: true},
    'updated_at': {type: Date, default: Date.now},
    'created_at': {type: Date, default: Date.now},
    'created_by': {type: String},
    'deleted': {type: Boolean, default: false},
    'deleted_at': {type: Date},
    'deleted_by': {type: String},
    'operation': {type: String},
    'published_ssl_config_version': {type: Number, default: 0},
    'last_published_ssl_config_version': {type: Number, default: 0},
    'comment': {type: String, default: ''},
    'public_ssl_cert': {type: String, required: true},
    'private_ssl_cert_key': {type: String, required: true},
    'private_ssl_cert_key_passphrase': {type: String},
    'chain_ssl_cert': {type: String, required: true},
    'expires_at': {type: Date},
    'domains': {type: String},
    'previous_ssl_cert_configs': [{}],
  });

  this.model = connection.model('SSLCertificate', this.SSLCertificateSchema, 'SSLCertificate');
}


mongoose.set('debug', config.get('mongoose_debug_logging'));


SSLCertificate.prototype = {

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
    this.model.find({deleted: { $ne: true }}, function (err, certs) {
      if (err) {
        callback(err, null);
      }
      var results = certs.map(function (r) {
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
  },
};

module.exports = SSLCertificate;
