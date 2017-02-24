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
var utils = require('../lib/utilities.js');

function APIKey(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.APIKeySchema = new this.Schema({
    'key'             : String,
    'key_name'        : String,
    'account_id'       : String,
    'managed_account_ids': [String],
    'domains'         : [String],
    'created_by'       : String,
    'allowed_ops'     : {
      read_config     : {type: Boolean, default: false},
      modify_config   : {type: Boolean, default: false},
      delete_config   : {type: Boolean, default: false},
      purge           : {type: Boolean, default: false},
      reports         : {type: Boolean, default: false},
      admin           : {type: Boolean, default: false},
    },
    'read_only_status': {type: Boolean, default: false},
    'active'          : {type: Boolean, default: true},
    'created_at'      : {type: Date, default: Date.now},
    'updated_at'      : {type: Date, default: Date.now}
  });

  this.model = connection.model('APIKey', this.APIKeySchema, 'APIKey');
}

APIKey.prototype = {

  get: function (item, callback) {
    this.model.findOne(item, function (err, doc) {
      if (doc) {

        doc = utils.clone(doc);
        doc.id = doc._id + '';

        delete doc.__v;
        delete doc._id;
      }
      callback(err, doc);
    });
  },

  add: function (item, callback) {
    new this.model(item).save(function (err, item) {
      if (item) {
        item = utils.clone(item);
        item.id = item._id + '';

        delete item.__v;
        delete item._id;
      }
      if (callback) {
        callback(err, item);
      }
    });
  },

  list: function (request, callback) {
    var options  = {};
    var filter_ = request.query.filters;
    if(!!filter_){
      if(!!filter_.account_id){
        options.account_id = {$regex: filter_.account_id, $options: 'i'};
      }
    }
    this.model.find(options, function (err, api_keys) {
      if (api_keys) {
        // TODO need to move the accesss control stuff out of the database model
        var keys = utils.clone(api_keys);
        for (var i = 0; i < keys.length; i++) {
          if (request.auth.credentials.role === 'revadmin' || utils.getAccountID(request).indexOf(keys[i].account_id) !== -1) {
            keys[i].id = keys[i]._id + '';
            delete keys[i]._id;
            delete keys[i].__v;
          } else {
            keys.splice(i, 1);
            i--;
          }
        }
      }
      callback(err, keys);
    });
  },

  update: function (item, callback) {
    this.model.findOne({
      key: item.key
    }, function (err, doc) {
      if (doc) {
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
            item.id =  item._id + '';

            delete item._id;
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  activate: function(item, callback) {
    this.model.findOne({
      key: item.key
    }, function (err, doc) {
      if (doc) {
        doc.active = true;
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          if (item) {
            item    = utils.clone(item);
            item.id = item._id + '';

            delete item._id;
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  deactivate: function(item, callback) {
    this.model.findOne({
      key: item.key
    }, function (err, doc) {
      if (doc) {
        doc.active = false;
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          if (item) {
            item    = utils.clone(item);
            item.id = item._id + '';

            delete item._id;
            delete item.__v;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  remove: function (item, callback) {
    var context = this;
    if (item) {
      this.get(item, function (err, data) {
        if (data) {
          context.model.remove(item, function (err) {
            callback(err, null);
          });
        } else {
          callback(true, null);
        }
      });
    } else {
      callback(utils.buildError('400', 'No API key passed to remove function'), null);
    }
  },

  removeMany: function (data, callback) {
    this.model.remove(data, callback);
  },

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
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
  //  returns _promise_ {
  //    account_id: { total: X, inactive: Y, active: Z },
  //    [account_id: { total: X, inactive: Y, active: Z },
  //    ...]
  //  }
  //  account_id can be array of IDs, one ID(string) or nothing to return data for all accounts
  accountAPIKeysData: function( account_id ) {

    var where = account_id ?
      { account_id: ( _.isArray( account_id ) ? { $in: account_id } : account_id/*string*/ ) } :
      {};

    return this.model.find( where, { _id: 0, account_id: 1, active: 1 } )
      .exec()
      .then( function( data ) {
        var dist = {};
        data.forEach( function( item ) {
          if ( !dist[item.account_id] ) {
            dist[item.account_id] = { total: 0, inactive: 0, active: 0 };
          }
          if ( item.active ) {
            ++dist[item.account_id].active;
          } else {
            ++dist[item.account_id].inactive;
          }
          ++dist[item.account_id].total;
        });
        return dist;
      });
  },

};

module.exports = APIKey;
