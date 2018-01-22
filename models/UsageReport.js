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
        }) : [] );
      });
  },

  //  ---------------------------------
  // free query
  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },

  /**
   *  scans today's reports for the given ID(s) and check if they need to recollect usage report data
   *
   * @param  {id|[id,..]|nothing} - either ID(string), an array of IDs or an empty string for all accounts
   * @return {promise([id,id,...])} - promise with array of account ids
   */
  checkIDsToRecollect : function ( account_id ) {

    var day = new Date();
    day.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day

    var where = { report_for_day: day };
    if ( account_id ) {
      where.account_id = _.isArray( account_id ) ? { $in: account_id } : /*string*/account_id;
    }

    return this.model.find( where, { _id: 0, account_id: 1, created_at: 1 })
      .exec()
      .then( function( docs ) {

        var id_re = /[0-9a-fA-F]{24}/,  //  ID regexp to filter out aux entities like summaries
          now = Date.now();
        docs = docs.map( function( doc ) {
          return doc._doc;
        })
        .filter( function( doc ) {
          return id_re.test( doc.account_id );
        });

        var ids = docs.filter( function( doc ) {
          //  is it old enought to recollect data
          return ( ( now - doc.created_at.getTime() ) > config.usage_report_regen_age_ms );
        })
        .map( function( doc ) {
          return doc.account_id;
        });

        //  then check for not found IDs
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
                ids.push( id );
              }
            });
          }
        }

        return ids;
      });
  },
  /**
   * @name aggregateDomainTrafficByDays
   * @description get traffic data for doamins
   */
  aggregateDomainTrafficByDays: function(options){
    var currentDay = options.current_date.toISOString().slice(0, 10);
    var previousDay =  options.previous_date.toISOString().slice(0,10);
    var match_ =  {
        $or: [
          { _id: { $regex: new RegExp(previousDay + '$') } },
          { _id: { $regex: new RegExp(currentDay + '$') } }
        ]
    };
    // NOTE: only one account
    if(options.account_id){
      match_.account_id = options.account_id;
    }
    return this.model.aggregate([
        {
          $match:  match_
        },
        {
          $project: {
            _id: 0,
            'report_for_day': '$report_for_day',
            'domains_usage': '$domains_usage',
          }
        },
        { $unwind: '$domains_usage' },
        {
          $project: {
            // _id: 1,
            'report_for_day': '$report_for_day',
            'domain': '$domains_usage.name',
            'traffic_per_billing_zone': '$domains_usage.traffic_per_billing_zone',
          }
        },
        {
          $group: {
            _id: '$domain',
            'traffics_day': {
              $push: {
                report_for_day: '$report_for_day',
                traffic_per_billing_zone: '$traffic_per_billing_zone'
              }
            },
          }
        },
        {
          $project: {
            _id: 0,
            'domain': '$_id',
            'traffics_day': 1
          }
        }
      ])

      .exec()
      .then(function(data){
        // NOTE: return information about total traffic in GB
        return _.map(data,function(doc) {
          doc.traffics_day.forEach(function(item) {
            var traffic_bites = Object.keys(item.traffic_per_billing_zone)
              .map(function(key) { return item.traffic_per_billing_zone[key].sent_bytes; });
            item.total_traffic_gb = ( traffic_bites.reduceRight(function(a, b) { return a + b; }) / 1073741824/*1024^3*/).toFixed(2) * 1;
            item.day = item.report_for_day.toISOString().slice(0, 10);
          });
          // NOTE: check data for each of days
          if(doc.traffics_day.length !== 2) {
            if(!_.find(doc.traffics_day, function(item){
              return item.day === currentDay;
            })){
              doc.traffics_day.push({
                total_traffic_gb: 0,
                day :currentDay,
                report_for_day: new Date(currentDay).setUTCHours(0,0,0,0)
              });
            }
            if(!_.find(doc.traffics_day, function(item) {
              return item.day === previousDay;
            })) {
              doc.traffics_day.push({
                total_traffic_gb: 0,
                day: currentDay,
                report_for_day: new Date(previousDay).setUTCHours(0, 0, 0, 0)
              });
            }
          }
          return doc;
        });
      });
  }
};

module.exports = UsageReport;
