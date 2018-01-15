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
//  ----------------------------------------------------------------------------------------------//

var _ = require('lodash'),
  config = require('config'),
  promise = require('bluebird');
var APP_PER_PLATFORMS_DEFAULT_DATA_OBJECT = {
  Windows_Mobile: {
    total: 0,
    active: 0,
    deleted: 0
  },
  Android: {
    total: 0,
    active: 0,
    deleted: 0
  },
  iOS: {
    total: 0,
    active: 0,
    deleted: 0
  }
};

var SSL_CERTIFICATES_DEFAULT_DATA_OBJECT = {
  private: {
    total: 0,
    active: 0,
    deleted: 0
  },
  shared: {
    total: 0,
    active: 0,
    deleted: 0
  }
};

function UsageReport( mongoose, connection, options ) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.UsageReportSchema = new this.Schema({
    '_id'                       : String,
    'account_id'                : String,
    'report_for_day'            : Date,
    'created_at'                : Date,
    'apps_per_platform'         : {type: this.Schema.Types.Mixed, default: APP_PER_PLATFORMS_DEFAULT_DATA_OBJECT },
    'ssl_certs'                 : {type: this.Schema.Types.Mixed},
    'ssl_certs_per_type'        : {type: this.Schema.Types.Mixed, default: SSL_CERTIFICATES_DEFAULT_DATA_OBJECT },
    'domains'                   : this.Schema.Types.Mixed,
    'domains_usage'             : this.Schema.Types.Mixed,
    'traffic_per_billing_zone'  : this.Schema.Types.Mixed
  });
  this.UsageReportSchema.index({ account_id: 1, type: 1 });
  this.UsageReportSchema.index({ report_for_day: 1, type: 1 });
  this.model = connection.model('UsageReport', this.UsageReportSchema, 'UsageReport');
}

//  ----------------------------------------------------------------------------------------------//
UsageReport.prototype = {
  //  ---------------------------------
  //  from/to - inclusive date interval
  //  aids - one account ID, an array of account IDs or false/undef for any
  list : function ( from, to, aids, fields ) {
    var where = {
      report_for_day: {
        $gte: ( from || ( new Date() ) ),
        $lte: ( to || ( new Date() ) )
      }
    };
    if ( aids ) {
      where.account_id = _.isArray( aids ) ? { $in: aids } : aids;
    }
    return this.model.find( where, ( fields || {} ) ).exec()
      .then( function( docs ) {
        return ( docs ? docs.map( function( doc ) {
          return doc._doc;
        }) : [] );
      });
    }
};

module.exports = UsageReport;
