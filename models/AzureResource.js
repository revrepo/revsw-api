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

function AzureResource(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;
  this.mongoose = mongoose;

  this.AzureResourceSchema = new this.Schema({
    'subscription_id': String,
    'created_by': String,
    'comment': {type: String, default: ''},
    'created_at'  : {type : Date, default : Date.now},
    'updated_at'  : {type : Date, default : Date.now},
    'deleted': {type: Boolean, default: false},
    'deleted_by': String,
    'deleted_at'  : {type : Date, default : null},
    'cancellation_message': {type: String, default: null},
    'resource_name': String,
    'resource_group_name': String,
    'resource_id': String,
    'properties': {},
    'plan': {},
    'tags': {},
    'account_id': this.ObjectId,
    'original_object': {}
  });

  this.model = connection.model('AzureResource', this.AzureResourceSchema, 'AzureResource');
}

AzureResource.prototype = {

  // adds a new item
  add : function (item, callback) {

    new this.model(item).save(function (err, resource) {
      if (callback) {

        resource    = utils.clone(resource);
        resource.id = resource._id + '';

        delete resource._id;

        callback(err, resource);
      }
    });
  },

  list : function (callback) {
    this.model.find({ deleted: { $ne: true } },function (err, accounts) {
      if(accounts) {
        accounts = utils.clone(accounts);
        for (var i = 0; i < accounts.length; i++) {
          var current = accounts[i];

          current.id = current._id + '';
          // TODO need to move the "delete" operations to a separate function (in all Account methods)
          delete current._id;
          delete current.__v;
          delete current.status;
        }
      }

      callback(err, accounts);
    });
  },

  listAll : function (callback) {
    this.model.find(function (err, resources) {
      if (resources) {
        resources = utils.clone(resources);
        for (var i = 0; i < resources.length; i++) {
          resources[i].id = resources[i]._id + '';
          delete resources[i]._id;
          delete resources[i].__v;
        }
      }

      callback(err, resources);
    });
  },

  get: function (item, callback) {
    item.deleted = { $ne: true };
    this.model.findOne(item, function (err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';

        delete doc.__v;
        delete doc._id;
        delete doc.status;
      }
      callback(err, doc);
    });
  },

  update : function (item, callback) {
    this.model.findOne({_id : item.id}, function (err, doc) {
      if (doc) {

        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
            item.id = item._id + '';
            delete item._id;
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  //  free _promise_ query
  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },
};

module.exports = AzureResource;
