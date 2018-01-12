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
var _ = require('lodash');
var utils = require('../lib/utilities.js');
var mongoose =  require('mongoose');
function ServerGroup(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.Types.ObjectId;

  this.ServerGroupSchema = new this.Schema({
    'groupName'               : String,
    'groupType'               : String,
    'servers'                 : String,
    'co_cnames'               : String,
    'serverType'              : String,
    'publicName'              : String,
    'id'                      : String,
    'transport_monitoring_url': String,
    'edge_host'               : String,
    'created_at'              : {type : Date, default : Date.now},
    'updated_at'              : {type : Date, default : Date.now}
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

  listFirstMileLocations : function (options,callback) {
    var params = {
      groupType : 'CO',
      serverType : 'public'
    };
    if(!!options && !!options.bp_group_id){
      if(_.isString(options.bp_group_id)){
        params.parent_bp_group_ids =  {$in: [ mongoose.Types.ObjectId(options.bp_group_id)]};
      }else{
        params.parent_bp_group_ids = {$in:  [options.bp_group_id]};
      }
    }
    this.model.find(params, function (err, servergroups) {
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
