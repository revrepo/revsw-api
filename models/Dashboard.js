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
//  data access layer

var utils = require('../lib/utilities.js');

function Dashboard(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.DashboardSchema = new this.Schema({
    user_id: {
      type: String,
      index: true
    },
    'title': String,
    'structure': {
      type: String,
      default: '6-6'
    }, // default
    'options': {
      type: Object,
      default: {
        autorefresh: ''
      }
    },
    'rows': [],
    'created_at': {
      type: Date,
      default: Date.now
    },
    'updated_at': {
      type: Date,
      default: Date.now
    }
  });

  this.model = connection.model('Dashboard', this.DashboardSchema, 'Dashboard');
}

Dashboard.prototype = {

  get: function(request, callback) {
    this.model.findOne(request, function(err, dashboard) {
      callback(err, dashboard);
    });
  },

  // adds a new dashboard
  add: function(item, callback) {
    new this.model(item).save(function(err, dashboard) {
      if (callback) {

        dashboard = utils.clone(dashboard);
        dashboard.id = dashboard._id + '';

        delete dashboard._id;

        callback(err, dashboard);
      }
    });
  },

  list: function(request, callback) {
    this.model.find(request, function(err, results) {
      callback(err, results);
    });
  },

  getDashboardsByUserID: function(user_id, callback) {
    this.model.find({
      user_id: user_id
    }, function(err, results) {
      callback(err, results);
    });
  },

  update: function(item, callback) {
    this.model.findOne({
      _id: item.id
    }, function(err, doc) {
      if (doc) {
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function(err, item) {
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
      callback(utils.buildError('400', 'No dashboard ID passed to remove function'), null);
    }
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

};

module.exports = Dashboard;
