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

function LogShippingJob(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.LogShippingJobSchema = new this.Schema({
    'job_name': String,
    'operational_mode': {type: String, default: 'stop'},
    'account_id': String,
    'created_by': String,
    'created_at': {type: Date, default: Date.now},
    'source_type': {type: String, default: 'domain'},
    'source_id': String,
    'destination_type': {type: String, default: 's3'},
    'destination_host': {type: String, default: ''},
    'destination_port': {type: String, default: ''},
    'destination_key': {type: String, default: ''},
    'destination_username': {type: String, default: ''},
    'destination_password': {type: String, default: ''},
    'notification_email': {type: String, default: ''},
    'comment': {type: String, default: ''},
    'updated_by': String,
    'updated_at': {type: Date, default: Date.now}
  });

  this.model = connection.model('LogShippingJob', this.LogShippingJobSchema, 'LogShippingJob');
}

LogShippingJob.prototype = {

  get: function (item, callback) {
    this.model.findOne({_id: item}, function (err, doc) {
      if (doc) {

        doc = utils.clone(doc);
        doc.id = doc._id + '';

        delete doc.__v;
        delete doc._id;
      }
      callback(err, doc);
    });
  },

  add: function (item, callback) {
    new this.model(item).save(function (err, item) {
      if (item) {
        item = utils.clone(item);
        item.id = item._id + '';

        delete item.__v;
        delete item._id;
      }
      if (callback) {
        callback(err, item);
      }
    });
  },

  list: function (callback) {
    this.model.find(function (err, items) {
      if (items) {
        items = utils.clone(items);
        for (var i = 0; i < items.length; i++) {
          items[i].id = items[i]._id + '';
          delete items[i]._id;
          delete items[i].__v;
        }
      }
      callback(err, items);
    });
  },

  update: function (item, callback) {
    this.model.findOne({
      _id: item.id
    }, function (err, doc) {
      if (doc) {
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
            item.id =  item._id + '';

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

  remove: function (item, callback) {
    var context = this;
    if (item) {
      this.get(item, function (err, data) {
        if (data) {
          context.model.remove(item, function (err) {
            callback(err, null);
          });
        } else {
          callback(true, null);
        }
      });
    } else {
      callback(utils.buildError('400', 'No object passed to remove function'), null);
    }
  },

  removeMany: function (data, callback) {
    this.model.remove(data, callback);
  },

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
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
  /**
   * @name accountLogShippingJobsCount
   * @description Count the number of per-account records in LogShippingJob collection
   * @param {String|Array} accountId
   */
  accountLogShippingJobsCount: function(accountId){
    var self = this;
    var where = {$and:[{ deleted: { $ne: true }, account_id: { $ne: null } }]};
    if ( !!accountId ) {
      if ( _.isArray( accountId ) ) {
        where.account_id = { $in: accountId.map( function( id ) {
          return  id ;
        }) };
      } else {
        where.account_id =  accountId ;
      }
    }

    return this.model.aggregate([
        { $match: where },
        { $project: {'account_id': 1}},
        { $group: {
            _id: '$account_id',
            count: { $sum: 1 }
         } }
      ])
      .exec()
      .then( function( docs ) {
        var hash = {};
        if ( docs ) {
          docs.forEach( function( doc ) {
            hash[doc._id.toString()] = doc;
          });
        }
        return hash;
      });
  }
};

module.exports = LogShippingJob;
