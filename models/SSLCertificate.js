/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var _ = require('lodash'),
  utils = require('../lib/utilities.js'),
  config = require('config'),
  mongoose = require('mongoose');
var logger = require('revsw-logger')(config.log_config);

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

function SSLCertificate(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.SSLCertificateSchema = new this.Schema({
    'cert_name': {type: String, required: true},
    'cert_type': {type: String, required: true},
    'account_id': {type: this.ObjectId, required: true},
    'updated_at': {type: Date, default: Date.now},
    'created_at': {type: Date, default: Date.now},
    'created_by': {type: String},
    'deleted': {type: Boolean, default: false},
    'deleted_at': {type: Date},
    'deleted_by': {type: String},
    'operation': {type: String},
    'published_ssl_config_version': {type: Number, default: 0},
    'last_published_ssl_config_version': {type: Number, default: 0},
    'comment': {type: String, default: ''},
    'public_ssl_cert': {type: String, required: true},
    'private_ssl_key': {type: String, required: true},
    'private_ssl_key_passphrase': {type: String},
    'chain_ssl_cert': {type: String, required: true},
    'expires_at': {type: Date},
    'domains': {type: String},
    'previous_ssl_cert_configs': [{}],
  });

  this.model = connection.model('SSLCertificate', this.SSLCertificateSchema, 'SSLCertificate');
}


mongoose.set('debug', config.get('mongoose_debug_logging'));


SSLCertificate.prototype = {

  get: function (item, callback) {
    this.model.findOne({_id: item, deleted: { $ne: true}}, function (err, _doc) {
      if (err) {
        callback(err);
      }
      var doc = utils.clone(_doc);
      callback(null, doc);
    });
  },

  query: function (where, callback) {
    if (!where || typeof (where) !== 'object') {
      callback(new Error('where clause not specified'));
    }
    this.model.find(where, function (err, doc) {
      if (err) {
        callback(err);
      }
      if (doc) {
        doc = utils.clone(doc).map(function (r) {
          delete r.__v;
          return r;
        });
      }
      callback(null, doc);
    });
  },

  list: function (callback) {
    this.model.find({deleted: { $ne: true }}, function (err, certs) {
      if (err) {
        callback(err, null);
      }
      var results = certs.map(function (r) {
        delete r.__v;
        return r;
      });
      callback(err, results);
    });
  },

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },
  // Get data about ssl_certs on moment call function or custom day
  //  account_id can be array of IDs, one ID(string) or nothing to return data for all accounts
  accountSSLCertificateData: function(account_id, day_) {
    var day = _.clone(day_);
    var pipline = [];
    var from, to ;
    if(!day){
      day = new Date();
    }
    if(!!day){
      from = day.setUTCHours( 0, 0, 0, 0 );
      to = day.setUTCHours( 24, 0, 0, 0 );
    }
    // NOTE: get total sum all SSL Certs on end of day
    var match_ = {
      $match: {
        $and: [
          { created_at: { $lt: new Date(to) } }, {
            $or: [
              { deleted: { $ne: true } },
              { deleted: { $ne: false } }
            ]
          }
        ]
      }
    };
    if (account_id) {
      var accountId ;
       if ( _.isArray( account_id ) ) {
        accountId = { $in: account_id.map( function( id ) {
          return mongoose.Types.ObjectId( id );
        }) };
      } else {
        accountId = mongoose.Types.ObjectId( account_id );
      }
      match_.$match.$and.push({ account_id: accountId });
    }
    pipline.push(match_);

    pipline.push({
      $project: {
        account_id: 1,
        deleted: 1
      }
    });
    // Group and get total sum for active and deleted SSL Certs
    pipline.push({
      $group: {
        _id: { account_id: '$account_id' },
        deleted: { $sum: { $cond: [{ $ne: ['$deleted', false] }, 1, 0] } },
        active: { $sum: { $cond: [{ $ne: ['$deleted', true] }, 1, 0] } },
        total: { $sum: 1 }
      }
    });
    //
    pipline.push({
      $project: {
        _id: '$_id.account_id',
        account_id: '$_id.account_id',
        deleted: 1,
        active: 1,
        total: 1
      }
    });
    return this.model.aggregate(pipline)
      .exec()
      .then(function(data) {
        var dist = {};
        data.forEach(function(item) {
          if (!dist[item.account_id]) {
            dist[item.account_id] = _.defaultsDeep({}, { total: 0, deleted: 0, active: 0 });
          }
          dist[item.account_id] = { total: item.total, deleted: item.deleted, active: item.active };
        });
        return dist;
      });
  },

  // Get data about ssl_certs_per_type on moment call function or custom day
  //  account_id can be array of IDs, one ID(string) or nothing to return data for all accounts
  accountSSLCertificatePerTypeData: function(account_id, day_) {
    var day = _.clone(day_);
    var pipline = [];
    var from, to ;
    if(!day){
      day = new Date();
    }
    if(!!day){
      from = day.setUTCHours( 0, 0, 0, 0 );
      to = day.setUTCHours( 24, 0, 0, 0 );
    }
    // NOTE: get total sum all SSL Certs on end of day
    var match_ = {
      $match: {
        $and: [
          { created_at: { $lt: new Date(to) } }, {
            $or: [
              { deleted: { $ne: true } },
              { deleted: { $ne: false } }
            ]
          }
        ]
      }
    };
    if (account_id) {
      var accountId ;
       if ( _.isArray( account_id ) ) {
        accountId = { $in: account_id.map( function( id ) {
          return mongoose.Types.ObjectId( id );
        }) };
      } else {
        accountId = mongoose.Types.ObjectId( account_id );
      }
      match_.$match.$and.push({ account_id: accountId });
    }
    pipline.push(match_);
    //
    pipline.push({
      $project: {
        account_id: 1,
        cert_type: 1,
        deleted: 1
      }
    });
    // Group and get tatal sum for active and deleted apps
    pipline.push({
      $group: {
        _id: { account_id: '$account_id', cert_type: '$cert_type' },
        deleted: { $sum: { $cond: [{ $ne: ['$deleted', false] }, 1, 0] } },
        active: { $sum: { $cond: [{ $ne: ['$deleted', true] }, 1, 0] } },
        total: { $sum: 1 }
      }
    });
    //
    pipline.push({
      $project: {
        _id: '$_id.account_id',
        account_id: '$_id.account_id',
        name: '$_id.cert_type',
        deleted: 1,
        active: 1,
        total: 1
      }
    });
    return this.model.aggregate(pipline)
      .exec()
      .then(function(data) {
        var dist = {};
        data.forEach(function(item) {
          if (!dist[item.account_id]) {
            dist[item.account_id] = _.defaultsDeep({}, SSL_CERTIFICATES_DEFAULT_DATA_OBJECT);
          }
          dist[item.account_id][item.name] = { total: item.total, deleted: item.deleted, active: item.active };
        });
        return dist;
      });
  }
};

module.exports = SSLCertificate;
