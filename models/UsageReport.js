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
// var mongoose = require('mongoose');
var promise = require('bluebird');
// mongoose.Promise = promise;

function UsageReport( mongoose, connection, options ) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.UsageReportSchema = new this.Schema({
    '_id'       : String,
    'for_date'  : Date,
    'accounts'  : this.Schema.Types.Mixed
  });

  this.model = connection.model('UsageReport', this.UsageReportSchema, 'UsageReport');
}

//  ---------------------------------
UsageReport.prototype = {

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

  // adds a new item or update(overwrite) existing
  upsert : function ( item ) {
    if ( !item.for_date ) {
      return promise.reject( new Error( 'UsageReport.add() error: insufficient data in item' ) );
    }
    var _id = item.for_date.toISOString().slice(0,10);
    return this.model.findOneAndUpdate({_id: _id}, item, { upsert: true }).exec();
  },

  //  from/to - inclusive date interval
  list : function ( from, to, fields ) {
    from = from || ( new Date() );
    to = to || ( new Date() );
    fields = fields || {};
    return this.model.find({ for_date: { $gte: from, $lte: to } }, fields ).exec()
      .then( function( docs ) {
        return ( docs ? docs.map( function( doc ) {
          return doc._doc;
        }) : docs );
      });
  },

  // free query
  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  }

};

module.exports = UsageReport;
