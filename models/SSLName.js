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


function SSLName(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.SSLNameSchema = new this.Schema({
    'ssl_name': {type: String, required: true},
    'verification_method': {type: String, required: true},
    'verification_object': {type: String, required: true},
    'account_id': {type: this.ObjectId, required: true},
    'updated_at': {type: Date, default: Date.now},
    'created_at': {type: Date, default: Date.now},
    'created_by': {type: String},
    'deleted': {type: Boolean, default: false},
    'deleted_at': {type: Date},
    'deleted_by': {type: String},
    'comment': {type: String, default: ''},
  });

  this.model = connection.model('SSLName', this.SSLNameSchema, 'SSLName');
}


mongoose.set('debug', config.get('mongoose_debug_logging'));


SSLName.prototype = {

  get: function (item, callback) {
    this.model.findOne({_id: item}, function (err, _doc) {
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

  update: function (item, callback) {
    this.model.findOne({_id: item.id}, function (err, doc) {
      if (err) {
        callback(err, null);
        return;
      }
      if (doc===null || item==null) {
        callback(null, null);
        return;
      }
      doc = _.assign(doc, item);
      if (doc===null) {
        console.log('wtf!');
        return;
      }
      doc.updated_at = new Date();
      doc.save(function (err, res) {
        if (err) {
          throw err;
        }
        callback(null, res);
      });
    });
  },

  remove: function (item, callback) {
    this.model.remove({_id: item._id}, function (err, doc) {
      if (err) {
        callback(err);
      }
      callback(null, doc);
    });
  },

};

module.exports = SSLName;