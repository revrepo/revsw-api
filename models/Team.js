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

var utils = require('../lib/utilities.js');
var _ = require('lodash');

var PermissionsSchema = require('./common/PermissionsSchema');

function Team(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.TeamSchema = new this.Schema({
    'access_permissions': {
      type: PermissionsSchema,
      ref: 'PermissionsSchema'
    },
    'account_id'  : String,
    'name'        : String,
    'description' : String,
    'created_at'  : {type: Date, default: Date()},
    'updated_at'  : {type: Date, default: Date()}
  });

  this.model = connection.model('Team', this.TeamSchema, 'Team');
}

Team.prototype = {
  add: function(item, callback) {
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

  get: function(item, callback) {
    this.model.findOne(item, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';

        doc = _.omit(doc, '__v', '_id');
      }

      callback(err, doc);
    });
  },

  getById: function(id, callback) {
    this.model.findById(id, function (err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id;
        doc = _.omit(doc, '__v', '_id');

        if (doc.account_id) {
          doc.account_id = doc.account_id.split(',');
        }
      }
      callback(err, doc);
    });
  },

  list: function(request, callback) {
    this.model.find(function (err, teams) {
      if (teams) {
        var isRevAdmin = request.auth.credentials.role === 'revadmin';

        teams = utils.clone(teams);

        teams = _.chain(teams)
          .filter(teams, function(t) {
            return isRevAdmin || request.auth.credentials.companyId.indexOf(t.account_id) !== -1;
          })
          .map(function(t) {
            return _.omit(t, '__v', '_id');
          })
          .value();
      }

      callback(err, teams);
    });
  },

  update: function(item, callback) {
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

            item = _.omit(item, '__v', '_id');
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
      callback(utils.buildError('400', 'No user ID passed to remove function'), null);
    }
  }
};
