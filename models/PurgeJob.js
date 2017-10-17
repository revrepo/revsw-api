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
//	data access layer
var _ = require('lodash');
var mongoose = require('mongoose');
var utils = require('../lib/utilities.js'),
  autoIncrement = require('mongoose-auto-increment');

function PurgeJob(mongoose, connection, options) {
  this.options  = options;
  this.Schema   = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.PurgeJobSchema = new this.Schema({
    'create_date_time'     : {
      type : Date, default : Date.now
    },
    'proxy_fail_count'     : {type : Number, default : 0},
    'proxy_list'           : {type : String, default : ''},
    'proxy_suc_count'      : {type : Number, default : 0},
    'proxy_suc_list'       : {type : String, default : ''},
    'req_status'           : {type : String, default : 'pending'},
    'req_domain'           : String,
    'req_email'            : String,
    'req_id'               : String,
    'request_json'         : {
      'version' : {type : Number, default : 0},
      'purges'  : [{
        url : {
          is_wildcard : Boolean,
          expression  : String,
          domain      : String
        }
      }]
    },
    'request_process_time' : {
      type : Date, default : Date()
    },
    'retry_proxy_list'     : {type : String, default : ''},
    'account_id': {type: this.ObjectId, default : null }
  });

  autoIncrement.initialize(connection);
  this.PurgeJobSchema.plugin(autoIncrement.plugin, { model: 'purge_jobs', field: 'serial_id' });
  this.model = connection.model('purge_jobs', this.PurgeJobSchema, 'purge_jobs');
}

PurgeJob.prototype = {

  add : function (item, callback) {
    new this.model(item).save(function (err, item) {
      if (callback) {
        callback(err, item);
      }
    });
  },

  get : function (request_id, callback) {
    if (request_id) {
      this.model.findOne({'req_id' : request_id}, function (err, doc) {
        callback(err, doc);
      });
    } else {
      callback(utils.buildError('400', 'No purge job ID passed to find item'), null);
    }
  },
  /**
   * @name accountPurgeJobsCount
   * @description Count the total number of records per account per domain
   */
  accountPurgeJobsCount: function(accountId){
    var self = this;
    var where = {$and:[{ deleted: { $ne: true }, account_id: { $ne: null } }]};
    if ( !!accountId ) {
      if ( _.isArray( accountId ) ) {
        where.account_id = { $in: accountId.map( function( id ) {
          return mongoose.Types.ObjectId( id );
        }) };
      } else {
        where.account_id = mongoose.Types.ObjectId( accountId );
      }
    }

    return this.model.aggregate([
        { $match: where },
        { $project: {  'account_id': 1, 'req_domain': 1}},
        { $group: {
            _id: '$account_id',
            count: { $sum: 1 },
            req_domain: {$push:'$req_domain'}
         } }
      ])
      .exec()
      .then( function( docs ) {
        var hash = {};
        if ( docs ) {
          docs.forEach( function( doc ) {
            hash[doc._id.toString()] = doc;
          });
        }
        return hash;
      });
  }

};

module.exports = PurgeJob;
