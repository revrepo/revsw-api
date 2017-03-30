/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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
var utils = require('../lib/utilities.js');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var mongoose = require('mongoose');

function DNSZone(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.DNSZoneSchema = new this.Schema({
    account_id: String,
    zone: {type: String, lowercase: true},
    created_at: {type: Date, default: Date.now},
    created_by: {type: String,default: ''},
    updated_at: {type: Date, default: Date.now},
    updated_by: {type: String, default: ''}
  });

  this.model = connection.model('DNSZone', this.DNSZoneSchema, 'DNSZone');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));

DNSZone.prototype = {
  add: function(item, callback) {
    new this.model(item).save(function(err, item) {
      if (item) {
        item = utils.clone(item);
        delete item.__v;
      }
      callback(err, item);
    });
  },
  get: function(item, callback) {
    this.model.findOne({_id: item}, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';
        delete doc._id;
        delete doc.__v;
      }
      callback(err, doc);
    });
  },
  list: function(where,callback) {
    var options ={};
    if( typeof(where) === 'function'){
      callback = where;
    } else {
      var filter_ = where.filters;
      if(!!filter_){
        if(!!filter_.account_id){
          options.account_id = {$regex: filter_.account_id, $options: 'i'};
        }
      }
    }
    this.model.find(options, function(err, dnsZones) {
      if (dnsZones) {
        dnsZones = utils.clone(dnsZones).map(function(dnsZone) {
          return {
            id: dnsZone._id + '',
            zone: dnsZone.zone,
            account_id: dnsZone.account_id,
            updated_at: dnsZone.updated_at,
            updated_by: dnsZone.updated_by,
          };
        });
      } else {
        dnsZones = null;
      }
      callback(err, dnsZones);
    });
  },
  getByZone: function(dnsZone, callback) {
    this.model.findOne({zone: dnsZone}, function(err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';
        delete doc._id;
        delete doc.__v;
      }
      callback(err, doc);
    });
  },

  getByAccountId: function(accountId, callback) {
    this.model.find({ account_id: accountId }, function(err, dnsZones) {
      if (dnsZones) {
        dnsZones = utils.clone(dnsZones).map(function(dnsZone) {
          return {
            id: dnsZone._id + '',
            zone: dnsZone.zone,
            account_id: dnsZone.account_id,
            updated_at: dnsZone.updated_at,
            updated_by: dnsZone.updated_by,
          };
        });
      } else {
        dnsZones = null;
      }
      callback(err, dnsZones);
    });
  },


  update: function(item, callback) {
    this.model.findOne({_id: item._id}, function(err, doc) {
      if (doc) {
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.save(function(err, item) {
          if (item) {
            item = utils.clone(item);
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },
  remove: function (id, callback) {
    this.model.remove({
      _id: id
    }, function (err, data) {
      callback(err, data.result);
    });
  },
  /**
   * @name accountDNSZonesCurrentData
   *
   * @description get information about DNS Zones for account(s) by day
   *
   */
  accountDNSZonesCurrentData: function(account_id,day){
    var pipline = [];
    var from, to ;
    if(!day){
      day = new Date();
    }
    if(!!day){
      from = day.setUTCHours( 0, 0, 0, 0 );
      to = day.setUTCHours( 24, 0, 0, 0 );
    }
   // NOTE: get count all exists DNS Zones
    var match_ = {
      $match: {
        $and: [
          { created_at: { $lt: new Date(to) } }
        ]
      }
    };
     if (account_id) {
      var accountId;
       if ( _.isArray( account_id ) ) {
        accountId = { $in: account_id.map( function( id ) {
          return id;
        }) };
      } else {
        accountId = account_id;
      }
      match_.$match.$and.push({ account_id: accountId });
    }

    pipline.push(match_);
    // Data for analysis
    pipline.push( {
        '$project': {
            'account_id': 1,
            'zone': 1
        }
    });
    // Group and sum
    pipline.push({'$group':{
           '_id': '$account_id',
           'total': {'$sum': 1}
    }});
    // return object
    pipline.push( {
        '$project': {
            'account_id': '$_id',
            'total': 1
        }
    });
    return this.model.aggregate(pipline)
      .exec()
      .then(function(data) {
        var dist = {};
        data.forEach(function(item) {
          if (!dist[item.account_id]) {
            dist[item.account_id] = 0;
          }
          dist[item.account_id] =   item.total;
        });
        return dist;
      });
  }
};

module.exports = DNSZone;
