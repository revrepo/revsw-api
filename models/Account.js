/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

function Account(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.Types.ObjectId;

  this.mongoose = mongoose;

  this.AccountSchema = new this.Schema({
    // TODO need to rename to account_name
    'companyName' : String,
    'status'      : {type : Boolean, default : true},
    'vendor_profile': { type: String, default: config.get('default_system_vendor_profile')},
    // TODO need to rename to created_by
    'createdBy'   : String,
    'id'          : String,
    'comment': {type: String, default: ''},
    'deleted': {type: Boolean, default: false},
    'billing_id': {type: String, default: null},
    'payment_method_configuration_status': {type: Boolean, default: false},
    'subscription_id': {type: String, default: null},
    'subscription_state': String,
    'billing_plan': String,
    'first_name':  String,
    'last_name':  String,
    'contact_email': String,
    'address1': String,
    'address2': String,
    'country': {type : String, default : 'US'},
    'state': String,
    'city': String,
    'zipcode': String,
    'masked_card_number': String,
    'phone_number': String,
    'use_contact_info_as_billing_info': {type: Boolean, default: false},
    'billing_info': {
      'first_name':  String,
      'last_name':  String,
      'contact_email': String,
      'address1': String,
      'address2': String,
      'country': {type : String, default : 'US'},
      'state': String,
      'city': String,
      'zipcode': String,
      'masked_card_number': String,
      'phone_number': String,
    },
    'billing_portal_link': {url: String, expires_at: Date},
    'created_at'  : {type : Date, default : Date.now},
    'updated_at'  : {type : Date, default : Date.now},
    'deleted_by': String,
    'deleted_at'  : {type : Date, default : null},
    'cancellation_message': {type: String, default: null},
    // Self register section
    'self_registered': {
        type: Boolean,
        default: false
    },
    'promocode': {type: String, default: null},
    'bp_group_id': {type: this.ObjectId, default : null },
    parent_account_id: {type: this.ObjectId, default: null}
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
    this.model.find({ deleted: { $ne: true } },function (err, accounts) {
      if(accounts) {
        accounts = utils.clone(accounts);
        for (var i = 0; i < accounts.length; i++) {
          var current = accounts[i];

          current.id = current._id + '';
          // TODO need to move the "delete" operations to a separate function (in all Account methods)
          delete current._id;
          delete current.__v;
          delete current.status;
        }
      }

      callback(err, accounts);
    });
  },

  listByParentID: function (filters, callback) {
    this.model.find({ deleted: { $ne: true }, parent_account_id: { $in: [filters] } }, function (err, accounts) {
      if (accounts) {
        accounts = utils.clone(accounts);
        for (var i = 0; i < accounts.length; i++) {
          var current = accounts[i];

          current.id = current._id + '';
          // TODO need to move the "delete" operations to a separate function (in all Account methods)
          delete current._id;
          delete current.__v;
          delete current.status;
        }
      }

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
  /**
   * @name listSubscribers
   * @description method for get list accounts with subscription_id
   * and witch subscription_state not 'canceled'
   */
  listSubscribers : function (filters, callback) {
    var filter = {
          deleted: {
            $ne: true
          },
          subscription_id: {
            $ne: null
          },
          subscription_state: {
            $ne: 'canceled'
          }
        };
    if(filters.subscription_id){
      filter.subscription_id = filters.subscription_id;
    }
    if(filters.account_id){
      filter._id = filters.account_id;
    }

    this.model.find(filter,function (err, accounts) {
      if(accounts) {
        accounts = utils.clone(accounts);
        for (var i = 0; i < accounts.length; i++) {
          var current = accounts[i];

          current.id = current._id + '';
          // TODO need to move the "delete" operations to a separate function (in all Account methods)
          delete current._id;
          delete current.__v;
          delete current.status;
        }
      }

      callback(err, accounts);
    });
  },
  get : function (item, callback) {
    item.deleted = { $ne: true };

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

  /**
   * @name  getBySubscriptionId
   * @description
   *
   *  Find Account by Subscription
   *
   * @param  {Staring}   subscriptionId
   * @param  {Function} callback       [description]
   * @return
   */
  getBySubscriptionId : function (subscriptionId, callback) {
    var  item = {
      subscription_id: subscriptionId
    };

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
    // TODO need to switch to use "id" instead of "account_id"
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
  },

  //  free _promise_ query
  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },

  /**
   *  account ID --> account Name hash
   *
   *  @param  {string|array(string)|nothing} - one account ID, an array of account IDs or false/undef for any
   *  @return promise({ _id: companyName, _id: companyName, ... })
   */
  idNameHash: function( account_ids ) {

    var self = this,
      where = { deleted: { $ne: true } };

    if ( account_ids ) {
      where._id = _.isArray(account_ids) ? { $in: account_ids } : account_ids;
    }

    return this.model.find( where, { _id: 1, companyName: 1 } )
      .exec()
      .then( function( data ) {
        var hash  = {};
        data.forEach( function( item ) {
          hash[item._id.toString()] = item.companyName;
        });
        return hash;
      });
  },

  /**
   *  return array of all non-deleted account IDs
   *
   *  @return promise([id,id,...])
   */
  allAliveIDs: function() {

    var where = { deleted: { $ne: true } };
    return this.model.find( where, { _id: 1 } )
      .exec()
      .then( function( data ) {
        return data.map( function( item ) {
          return item._id.toString();
        });
      });
  },

  /**
   *  return array of all account IDs, non-deleted or deleted in the given day
   *
   *  @param {Date|nothing} - ignore accounts deleted before this date and created after, default today
   *  @return promise([id,id,...])
   */
  allHalfDeadIDs: function( day_ ) {
    var day = new Date();
    if(_.isDate(day_)){
      day = _.clone(day_);
    }
    day.setUTCHours( 0, 0, 0, 0 );  //  very begin of the day
    var where = {
      $or: [
        { deleted_at: { $gte: day } },
        { deleted: { $ne: true } }
      ],
      created_at: { $lte: ( new Date( day.valueOf() + 86400000/*day in ms*/ ) ) }
    };

    return this.model.find( where, { _id: 1 } )
      .exec()
      .then( function( data ) {
        return data.map( function( item ) {
          return item._id.toString();
        });
      });
  }

};

module.exports = Account;
