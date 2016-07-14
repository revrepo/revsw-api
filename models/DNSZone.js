/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

function DNSZone(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.DNSZoneSchema = new this.Schema({
    account_id: String,
    zone: {type: String, lowercase: true},
    created_at: {type: Date, default: Date.now},
    created_by: {type: String,default: ''},
    updated_at: {type: Date, default: Date.now},
    updated_by: {type: String, default: ''}
  });

  this.model = connection.model('DNSZone', this.DNSZoneSchema, 'DNSZone');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));

DNSZone.prototype = {
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
    this.model.findOne({_id: item}, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';
        delete doc._id;
        delete doc.__v;
      }
      callback(err, doc);
    });
  },
  list: function(callback) {
    this.model.find({}, function(err, dnsZones) {
      if (dnsZones) {
        dnsZones = utils.clone(dnsZones).map(function(dnsZone) {
          return {
            id: dnsZone._id + '',
            zone: dnsZone.zone,
            account_id: dnsZone.account_id,
            updated_at: dnsZone.updated_at,
            updated_by: dnsZone.updated_by,
          };
        });
      } else {
        dnsZones = null;
      }
      callback(err, dnsZones);
    });
  },
  getByZone: function(dnsZone, callback) {
    this.model.findOne({zone: dnsZone}, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';
        delete doc._id;
        delete doc.__v;
      }
      callback(err, doc);
    });
  },

  getByAccountId: function(accountId, callback) {
    this.model.find({ account_id: accountId }, function(err, dnsZones) {
      if (dnsZones) {
        dnsZones = utils.clone(dnsZones).map(function(dnsZone) {
          return {
            id: dnsZone._id + '',
            zone: dnsZone.zone,
            account_id: dnsZone.account_id,
            updated_at: dnsZone.updated_at,
            updated_by: dnsZone.updated_by,
          };
        });
      } else {
        dnsZones = null;
      }
      callback(err, dnsZones);
    });
  },


  update: function(item, callback) {
    this.model.findOne({_id: item._id}, function(err, doc) {
      if (doc) {
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
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
  remove: function (id, callback) {
    this.model.remove({
      _id: id
    }, function (err, data) {
      callback(err, data.result);
    });
  }
};

module.exports = DNSZone;
