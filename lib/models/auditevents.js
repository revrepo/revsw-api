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
	this.options  = options;
	this.Schema   = mongoose.Schema;
	this.ObjectId = this.Schema.ObjectId;

	this.AuditEventsSchema = new this.Schema({
    meta : {
      domain_id        : String,
      company_id       : String,
      datetime         : Number,
      usertype         : String,
      username         : String,
      user_id          : String,
      account          : String,
      account_id       : String,
      activity_type    : String,
      activity_target  : String,
      target_name      : String,
      target_id        : String,
      operation_status : String,
      target_object    : Object
    }
	});

	this.model = connection.model('audit_events', this.AuditEventsSchema, 'audit_events');
}

AuditEvents.prototype = {
	detailed: function(request, callback) {
    this.model.find( request, function (err, auditevents) {
      var data = [];
      for (var key in auditevents) {
        data.push(auditevents[key].meta);
      }
      callback(err, data);
    });
	},

	summary: function(request, callback) {
		this.model.find( request, function (err, auditevents) {
      var data = [];
      for (var key in auditevents) {
        data.push(auditevents[key].meta);
      }
			callback(err, data);
		});
	}
};

exports.AuditEvents = AuditEvents;
