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
    'created_at'                : Date,
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
  },

  //  ---------------------------------
  //  returns promise array [{ account_id: '000000000000000000000000', created_at: Sat Mar 19 2016 }, ...]
  //  day is report_for_day value, default today
  //  account_id can be either ID(string), an array of IDs or an empty string for all accounts
  lastCreatedAt : function ( day, account_id ) {
    if ( !day ) {
      day = new Date();
      day.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
    }

    var where = { report_for_day: day };
    if ( account_id ) {
      where.account_id = _.isArray( account_id ) ? { $in: account_id } : /*string*/account_id;
    }
    return this.model.find( where, { _id: 0, account_id: 1, created_at: 1 })
      .exec()
      .then( function( docs ) {
        if ( docs ) {
          docs = docs.map( function( doc ) {
            return doc._doc;
          });
          if ( account_id ) {
            if ( _.isString( account_id ) ) {
              account_id = [account_id];
            }
            if ( docs.length < account_id.length ) {
              //  some ids not found
              var not_found = [];
              account_id.forEach( function( id ) {
                //  v0.10 doesn't support Array.find
                var found = _.find( docs, function( doc ) {
                  return doc.account_id === id;
                });
                if ( !found ) {
                  not_found.push({ account_id: id, created_at: false });
                }
              });
              docs = docs.concat( not_found );
            }
          }
        }
        return docs;
      });

    // return this.model.aggregate([
    //   { $match: match },
    //   { $group: { _id: '$account_id', minCreated: { $min: '$created_at' } } }
    // ]).exec();
  },


};

module.exports = UsageReport;
