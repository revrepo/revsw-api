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

function Account(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;
  this.mongoose = mongoose;

  this.AccountSchema = new this.Schema({
    // TODO need to rename to account_name
    'companyName' : String,
    'status'      : {type : Boolean, default : true},
    // TODO need to rename to created_by
    'createdBy'   : String,
    'id'          : String,
    'address1'             : String,
    'address2'             : String,
    'country'              : {type : String, default : 'US'},
    'state'                : String,
    'city'                 : String,
    'zipcode'              : String,
    'phone_number'         : String,
    'subscription_id': {type: String, default: null},
    'subscription_state': String,
    'billing_plan': String,
    'created_at'  : {type : Date, default : Date()},
    'updated_at'  : {type : Date, default : Date()}
  });

  this.model = connection.model('Company', this.AccountSchema, 'Company');
}

Account.prototype = {

  // adds a new item
  add : function (item, callback) {

    new this.model(item).save(function (err, account) {
      if (callback) {

        account    = utils.clone(account);
        account.id = account._id + '';

        delete account._id;

        callback(err, account);
      }
    });
  },

  list : function (callback) {
    this.model.find(function (err, accounts) {
      callback(err, accounts);
    });
  },

  listAll : function (request, callback) {
    this.model.find(function (err, accounts) {
      if (accounts) {
        accounts = utils.clone(accounts);
        for (var i = 0; i < accounts.length; i++) {
          accounts[i].id = accounts[i]._id + '';
          delete accounts[i]._id;
          delete accounts[i].__v;
          delete accounts[i].status;
        }
      }

      callback(err, accounts);
    });
  },

  get : function (item, callback) {
    this.model.findOne(item, function (err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.id = doc._id + '';

        delete doc.__v;
        delete doc._id;
        delete doc.status;
      }
      callback(err, doc);
    });
  },

  update : function (item, callback) {
    this.model.findOne({_id : item.account_id}, function (err, doc) {
      if (doc) {

        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
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

  remove : function (item, callback) {
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
      callback(utils.buildError('400', 'No account ID passed to remove function'), null);
    }
  }
};

module.exports = Account;
