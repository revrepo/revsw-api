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

function AuditEvents(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.AuditEventsSchema = new this.Schema({
    meta : {
      domain_id        : {type : String},
      company_id       : {type : String},
      datetime         : {type : Number},
      usertype         : {type : String},
      username         : {type : String},
      user_id          : {type : String},
      account          : {type : String},
      account_id       : {type : String},
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
    this.model.find(request, function (err, auditevents) {
      var data = [];
      for (var key in auditevents) {
        data.push(auditevents[key].meta);
      }
      callback(err, data);
    });
  },

  summary : function (request, callback) {
    var response    = [];
    var requestBody = [
      {
        $match : request
      },
      {
        $group : {
          _id    : {
            ip_adress        : '$meta.ip_adress',
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
      for (var key in auditevents) {
        response[key] = {
          metadata     : {
            user_id   : auditevents[key]._id.user_id,
            ip_adress : auditevents[key]._id.ip_adress
          },
          data : {
            activity_type    : auditevents[key]._id.activity_type,
            activity_target  : auditevents[key]._id.activity_target,
            email            : auditevents[key]._id.email,
            firstname        : auditevents[key]._id.firstname,
            lastname         : auditevents[key]._id.lastname,
            operation_status : auditevents[key]._id.operation_status,
            amount           : auditevents[key].amount
          }
        };
      }
      callback(err, response);
    });
  }
};

module.exports = AuditEvents;
