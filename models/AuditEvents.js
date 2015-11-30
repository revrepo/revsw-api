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

var config = require('config');

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
      account_id       : {type : Array},
      activity_type    : {type : String},
      activity_target  : {type : String},
      target_name      : {type : String},
      target_id        : {type : String},
      operation_status : {type : String},
      target_object    : {type : Object, default : {}}
    }
  });

  this.model = connection.model('audit_events', this.AuditEventsSchema, 'audit_events');
}

AuditEvents.prototype = {
  detailed : function (request, callback) {
    this.model.find(request).sort({'meta.timestamp': 'descending'}).limit(config.get('number_of_reported_audit_log_records')).exec( function (err, auditevents) {
      var data      = [];
      for (var key in auditevents) {
        var innerData = {
          ip_address        : auditevents[key].meta.ip_address,
          user_id          : auditevents[key].meta.user_id,
          user_name        : auditevents[key].meta.user_name,
          user_type        : auditevents[key].meta.user_type,
          company_id       : auditevents[key].meta.company_id,
          datetime         : auditevents[key].meta.datetime,
          account          : auditevents[key].meta.account,
          account_id       : auditevents[key].meta.account_id,
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
