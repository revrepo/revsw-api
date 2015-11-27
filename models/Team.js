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

  },

  get: function(item, callback) {

  },

  getById: function(id, callback) {

  },

  list: function(request, callback) {

  },

  listAll: function(request, callback) {

  },

  update: function(item, callback) {

  },

  remove: function(item, callback) {

  }
};
