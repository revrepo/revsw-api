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

function DNSUser(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.DNSUserSchema = new this.Schema({
    account_id: String,
    zones: [{type: String, lowercase: true}]
  });

  this.model = connection.model('DNSUser', this.DNSUserSchema, 'DNSUser');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));

DNSUser.prototype = {
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
    this.model.findOne({account_id: item}, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        delete doc.__v;
      }
      callback(err, doc);
    });
  },
  accountListZones: function(aids, callback) {
    this.model.find({account_id: {$in: aids}}, {zones: 1}, function(err, dnsUsers) {
      var zones = [];
      if (dnsUsers) {
        dnsUsers.forEach(function(dnsUser) {
          zones.push.apply(zones, dnsUser.zones);
        });
      }
      callback(err, zones);
    });
  },
  getByZone: function(dnsZone, callback) {
    this.model.findOne({zones: {$in: [dnsZone]}}, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        delete doc.__v;
      }
      callback(err, doc);
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
  }
};

module.exports = DNSUser;
