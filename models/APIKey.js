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

var utils = require('../lib/utilities.js');

function APIKey(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.APIKeySchema = new this.Schema({
    'key'             : String,
    'key_name'        : String,
    'companyId'       : String,
    'domains'         : [{domain: String}],
    'createdBy'       : String,
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
    'created_at'      : {type: Date, default: Date()},
    'updated_at'      : {type: Date, default: Date()}
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
      if (callback) {
        item    = utils.clone(item);
        item.id = item._id + '';

        delete item._id;

        callback(err, item);
      }
    });
  },

  list: function (request, callback) {
    this.model.find(function (err, api_keys) {
      if (api_keys) {
        var keys = utils.clone(api_keys);
        for (var i = 0; i < keys.length; i++) {
          if (request.auth.credentials.companyId.indexOf(keys[i].companyId) !== -1) {
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
  }
};

module.exports = APIKey;
