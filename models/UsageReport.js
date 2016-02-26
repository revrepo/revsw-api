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

var _ = require('lodash');
var promise = require('bluebird');

function UsageReport( mongoose, connection, options ) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.UsageReportSchema = new this.Schema({
    '_id'                       : String,
    'account_id'                : String,
    'report_for_day'            : Date,
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
  get : function ( id, fields ) {
    fields = fields || {};
    if ( _.isDate( id ) ) {
      id = id.toISOString().slice(0,10);
    }
    return this.model.findOne({ _id: id }, fields)
      .then( function( doc ) {
        return ( doc ? doc._doc : doc );
      });
  },

  //  ---------------------------------
  // adds a new item or update(overwrite) existing
  upsert : function ( item ) {
    if ( !item.report_for_day || !item.account_id ) {
      return promise.reject( new Error( 'UsageReport.add() error: insufficient data in item' ) );
    }
    var _id = item.account_id + '-' + item.report_for_day.toISOString().slice(0,10);
    return this.model.findOneAndUpdate({_id: _id}, item, { upsert: true }).exec();
  },

  //  ---------------------------------
  // adds a new items or update(overwrite) existing
  bulk_upsert : function ( items ) {
    var bulk = this.model.collection.initializeUnorderedBulkOp();
    items.forEach( function( item ) {
      item._id = item.account_id + '-' + item.report_for_day.toISOString().slice(0,10);
      bulk.find({_id:item._id}).upsert().updateOne(item);
    });
    return bulk.execute();
  },

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
        }) : docs );
      });
  },

  //  ---------------------------------
  // free query
  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  }

};

module.exports = UsageReport;
