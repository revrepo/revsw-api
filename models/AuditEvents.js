/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var _ = require('lodash');
var config = require('config');
var utils = require('../lib/utilities.js');

function AuditEvents(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.AuditEventsSchema = new this.Schema({
    meta : {
      company_id       : {type : String},
      datetime         : {type : Number},
      user_type        : {type : String},
      user_name        : {type : String},
      user_id          : {type : String},
      account          : {type : String},
      account_id       : { type: String, index: true},
      activity_type    : { type: String, index: true},
      activity_target  : { type: String, index: true},
      target_name      : {type : String},
      target_id        : { type: String, index: true},
      operation_status : {type : String},
      target_object    : {type : Object, default : {}}
    }
  });
  this.AuditEventsSchema.path('meta.datetime').index(true);
  this.AuditEventsSchema.index({ 'meta.account_id': 1, 'meta.activity_type': 1});
  this.AuditEventsSchema.index({ 'meta.account_id': 1, 'meta.activity_target': 1 });
  this.AuditEventsSchema.index({ 'meta.account_id': 1, 'meta.activity_type': 1, 'meta.activity_target': 1});
  this.AuditEventsSchema.index({ 'meta.account_id': 1, 'meta.activity_type': 1, 'meta.activity_target': 1, 'meta.target_id': 1, 'meta.datetime': 1});
  this.model = connection.model('audit_events', this.AuditEventsSchema, 'audit_events');
}

AuditEvents.prototype = {

  list: function(params, callback) {
    this.model.find(params, function(err, results) {
      if(!err && results){
        results = _.map(results,function(item){
          return {
            ip_address: item.meta.ip_address,
            user_id: item.meta.user_id,
            user_name: item.meta.user_name,
            user_type: item.meta.user_type,
            account_id: item.meta.account_id,
            datetime: item.meta.datetime,
            account: item.meta.account,
            activity_type: item.meta.activity_type,
            activity_target: item.meta.activity_target,
            target_name: item.meta.target_name,
            target_id: item.meta.target_id,
            operation_status: item.meta.operation_status,
            target_object: item.meta.target_object
          };
        });
      }
      callback(err, results);
    });
  },

  detailed : function (request, callback) {
    this.model.find(request).sort({'timestamp': 'descending'}).limit(config.get('number_of_reported_audit_log_records')).exec( function (err, auditevents) {
      var data      = [];
      for (var key in auditevents) {
        var innerData = {
          ip_address        : auditevents[key].meta.ip_address,
          user_id          : auditevents[key].meta.user_id,
          user_name        : auditevents[key].meta.user_name,
          user_type        : auditevents[key].meta.user_type,
          account_id       : auditevents[key].meta.account_id,
          datetime         : auditevents[key].meta.datetime,
          account          : auditevents[key].meta.account,
          activity_type    : auditevents[key].meta.activity_type,
          activity_target  : auditevents[key].meta.activity_target,
          target_name      : auditevents[key].meta.target_name,
          target_id        : auditevents[key].meta.target_id,
          operation_status : auditevents[key].meta.operation_status,
          target_object    : auditevents[key].meta.target_object

        };
        data.push(innerData);
      }
      callback(err, data);
    });
  },

  summary : function (request, callback) {
    var requestBody = [
      {
        $match : request
      },
      {
        $group : {
          _id    : {
            ip_address        : '$meta.ip_address',
            user_id          : '$meta.user_id',
            email            : '$meta.target_object.email',
            firstname        : '$meta.target_object.firstname',
            lastname         : '$meta.target_object.lastname',
            activity_type    : '$meta.activity_type',
            activity_target  : '$meta.activity_target',
            operation_status : '$meta.operation_status'
          },
          amount : {
            $sum : 1
          }
        }
      }
    ];

    this.model.aggregate(requestBody, function (err, auditevents) {
      var data = [];
      for (var key in auditevents) {
        var innerData = {
          activity_target  : auditevents[key]._id.activity_target,
          activity_type    : auditevents[key]._id.activity_type,
          email            : auditevents[key]._id.email,
          firstname        : auditevents[key]._id.firstname,
          lastname         : auditevents[key]._id.lastname,
          operation_status : auditevents[key]._id.operation_status,
          amount           : auditevents[key].amount
        };
        data.push(innerData);
      }
      callback(err, data);
    });
  }
};

module.exports = AuditEvents;
