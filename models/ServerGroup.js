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

function ServerGroup(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.ServerGroupSchema = new this.Schema({
    'groupName'  : String,
    'groupType'  : String,
    'servers'    : String,
    'co_cnames'  : String,
    'serverType' : String,
    'publicName' : String,
    'id'         : String,
    'created_at' : {type : Date, default : Date()},
    'updated_at' : {type : Date, default : Date()}
  });

  this.model = connection.model('ServerGroup', this.ServerGroupSchema, 'ServerGroup');
}

ServerGroup.prototype = {

  get : function (request, callback) {
    this.model.findOne(request, function (err, servergroups) {
      callback(err, servergroups);
    });
  },

  list : function (request, callback) {
    this.model.find(request, function (err, servergroups) {
      callback(err, servergroups);
    });
  },

  listFirstMileLocations : function (callback) {
    this.model.find({groupType : 'CO', serverType : 'public'}, function (err, servergroups) {
      callback(err, servergroups);
    });
  },

  listAll : function (callback) {
    this.model.find(function (err, servergroups) {
      callback(err, servergroups);
    });
  }

};

module.exports = ServerGroup;
