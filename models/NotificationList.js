/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

var utils = require('../lib/utilities.js');
var _ = require('lodash');

function NotificationList(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.NotificationListSchema = new this.Schema({
    'list_name': {
      type: String,
      default: 'Default Notification List'
    },
    'account_id': String,
    'destinations': {
      type: Array,
      default: []
    },
    'created_by': String,
    'created_at': {
      type: Date,
      default: Date.now
    },
    'updated_by': String,
    'updated_at': {
      type: Date,
      default: Date.now
    }
  });

  this.NotificationListSchema.set('toJSON', {
    transform: function(doc, ret, options) {
      // remove the _id of every document before returning the result
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  });

  this.model = connection.model('NotificationList', this.NotificationListSchema, 'NotificationList');
}

NotificationList.prototype = {

  get: function(options, callback) {
    var params = {};
    if (options.id || options._id) {
      params._id = (!!options.id) ? options.id : options._id;
    }
    this.model.findOne(params, function(err, NotificationLists) {
      callback(err, NotificationLists);
    });
  },

  add: function(item, callback) {
    new this.model(item).save(function(err, item) {
      if (callback) {
        callback(err, item);
      }
    });
  },

  list: function(options, callback) {
    var params = {};
    if (!!options.account_id) {
      params.account_id = options.account_id;
    }
    this.model.find(params, function(err, NotificationLists) {
      callback(err, NotificationLists);
    });
  },

  listAll: function(callback) {
    this.list({}, function(err, NotificationLists) {
      callback(err, NotificationLists);
    });
  },

  update: function(item, callback) {
    this.model.findOne({
      _id: item._id
    }, function(err, doc) {
      if (doc) {
        for (var attrname in item) { // update fields with new values
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function(err, item) {
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  remove: function(item, callback) {
    var context = this;
    if (item) {
      this.get(item, function(err, data) {
        if (data) {
          context.model.remove(item, function(err) {
            callback(err, null);
          });
        } else {
          callback(true, null);
        }
      });
    } else {
      callback(utils.buildError('400', 'No Notification List passed to remove function'), null);
    }
  },
  checkReasonForUpdate: function(newData, currentData, callback) {
    var res = {
      isDiff: false,
    };

    if (!newData || !currentData) {
      callback(new Error('Bad parameters for check'));
    }

    if ((newData.list_name !== currentData.list_name) ||
      (newData.destinations.length !== currentData.destinations.length)) {
      res.isDiff = true;
      return callback(null, res);
    }
    for (var x = 0; x < currentData.destinations.length; x++) {
      if (res.isDiff === true) {
        continue;
      }
      res.isDiff = !_.isEqual(currentData.destinations[x], newData.destinations[x]);
    }

    callback(null, res);
  }
};

module.exports = NotificationList;
