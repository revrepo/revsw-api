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

var utils = require('../lib/utilities.js');
var _ = require('lodash');
var promise = require('bluebird');

function User(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.UserSchema = new this.Schema({
    'access_control_list'  : {
      dashBoard : {type : Boolean, default : true},
      reports   : {type : Boolean, default : true},
      configure : {type : Boolean, default : true},
      test      : {type : Boolean, default : true},
      readOnly  : {type : Boolean, default : false}
    },
    // TODO need to rename to account_id
    'companyId'            : String,
    'domain'               : {type: String, lowercase: true},
    'email'                : String,
     // TODO rename to first_name
    'firstname'            : String,
    // TODO rename to last_name
    'lastname'             : String,
    'password'             : String,
    'role'                 : {type : String, default : 'user'},
    'status'               : {type : Boolean, default : true},
    'theme'                : {type : String, default : 'light'},
    'token'                : String,
    'created_at'           : {type : Date, default : Date.now},
    'updated_at'           : {type : Date, default : Date.now},
    'last_login_at'        : {type : Date, default: null},
    'last_login_from'      : {type : String, default: null},
    // TODO: need to fix the ugly names of the two variables
    // should be reset_password_token and reset_password_expires
    'resetPasswordToken'   : String,
    'resetPasswordExpires' : Number,
    'two_factor_auth_enabled': {type: Boolean, default: false},
    'two_factor_auth_secret_base32': String,

    // Self register section
    self_registered: {
      type: Boolean,
      default: false
    },
    company_name: {
      type: String
    },
    old_passwords: [String],

    'validation': {
      // TODO: should be "expired_at"
      'expiredAt': Date,
      'token': String,
      'verified': {type: Boolean, default: false}
    },

    billing_plan: this.ObjectId,

    deleted: { type: Boolean, default: false },
    comment: { type: String, default: ''},
    invitation_token: { type: String, default: null },
    invitation_expire_at: { type: Date, default: Date.now }
  });

  this.model = connection.model('User', this.UserSchema, 'User');
}

User.prototype = {

  // adds a new item
  add : function (item, callback) {

    var hash = utils.getHash(item.password);
    item.password = hash;

    if (utils.isArray(item.domain)) {
      item.domain = item.domain.join(',').toLowerCase();
    }

    if (utils.isArray(item.companyId)) {
      item.companyId = item.companyId.join(',');
    }

    new this.model(item).save(function (err, item) {
      if (callback) {
        item = utils.clone(item);
        item.user_id = item._id;

        delete item.__v;
        delete item._id;
        //delete item.id;

        callback(err, item);
      }
    });
  },

  get : function (item, callback) {

    this.model.findOne(item, function (err, doc) {
      if (doc) {

        doc = utils.clone(doc);
        doc.user_id = doc._id;

        // TODO: need to move all the "delete" operations to a separate function (and call it from all User methods)

        delete doc.__v;
        delete doc._id;
        delete doc.id;
        delete doc.token;
        delete doc.status;
        delete doc.validation;
        delete doc.old_passwords;

        if (doc.companyId) {
          doc.companyId = doc.companyId.split(',');
        } else {
          doc.companyId = [];
        }
        if (doc.domain) {
          doc.domain = doc.domain.toLowerCase().split(',');
        } else {
          doc.domain = [];
        }

      }
      callback(err, doc);
    });
  },

  getById : function (id, callback) {

    this.model.findById(id, function (err, doc) {
      if (doc) {
        doc = utils.clone(doc);
        doc.user_id = doc._id;
        delete doc.__v;
        delete doc._id;
        delete doc.token;
        delete doc.status;
        delete doc.id;
        delete doc.validation;
        delete doc.old_passwords;

        if (doc.companyId) {
          doc.companyId = doc.companyId.split(',');
        }
        if (doc.domain) {
          doc.domain = doc.domain.toLowerCase().split(',');
        } else {
          doc.domain = [];
        }

      }
      callback(err, doc);
    });
  },

  getValidation : function (item, callback) {
    this.model.findOne(item, function (err, doc) {
      if (doc) {

        doc = utils.clone(doc);
        doc.user_id = doc._id;

        delete doc.__v;
        delete doc._id;
        delete doc.id;
        delete doc.token;
        delete doc.status;
        delete doc.old_passwords;

        if (doc.companyId) {
          doc.companyId = doc.companyId.split(',');
        } else {
          doc.companyId = [];
        }
        if (doc.domain) {
          doc.domain = doc.domain.toLowerCase().split(',');
        } else {
          doc.domain = [];
        }

      }
      callback(err, doc);
    });
  },
  /**
   * @name  updateValidation
   * @description
   *
   * @param  {Object}   item
   * @param  {Function} callback
   * @return
   */
  updateValidation : function (item, callback) {
    this.model.findOne({_id : item.user_id}, function (err, doc) {
      if (doc) {
        if(!!item.validation && item.validation.verified === true){
            item.validation = {
              expiredAt: undefined,
              token: '',
              verified: true
            };
        }
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();
        doc.user_id = doc._id;

        delete doc.__v;
        delete doc._id;
        delete doc.id;
        delete doc.token;
        delete doc.status;
        delete doc.old_passwords;

        if (doc.companyId) {
          doc.companyId = doc.companyId.split(',');
        } else {
          doc.companyId = [];
        }
        if (doc.domain) {
          doc.domain = doc.domain.toLowerCase().split(',');
        } else {
          doc.domain = [];
        }
        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
            item.user_id = item._id;

            delete item._id;
            delete item.__v;
            delete doc.token;
            delete doc.status;
            delete item.old_passwords;
          }
          callback(err, item);
        });
      }else{
        callback(err, doc);
      }
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
  /**
   * @name list
   * @description method get list of users data
   */
  list: function(params, callback) {
    var options = {};
    if(!!params.account_id){
      if(_.isArray(params.account_id)){
        options.$or = [];
        _.each(params.account_id,function(item){
          options.$or.push({
            companyId: { $regex: item, $options: 'i' }
          });
        });
      }else{
        options.companyId = { $regex: params.account_id, $options: 'i'};
      }
    }
    // NOTE: don't show the fields "validation", "password", "old_passwords", "__v"
    this.model.find(options, '-validation -password -old_passwords -__v', function (err, users) {
      if (users) {
        users = utils.clone(users);
        for (var i = 0; i < users.length; i++) {
          if (users[i].companyId) {
            users[i].companyId = users[i].companyId.split(',');
          } else {
            users[i].companyId = [];
          }

          users[i].user_id = users[i]._id;
          users[i].two_factor_auth_enabled = users[i].two_factor_auth_enabled || false;
          delete users[i]._id;

          if (users[i].domain && users[i].domain !== '') {
            users[i].domain = users[i].domain.toLowerCase().split(',');
          } else {
            users[i].domain = [];
          }
        }
      }
      //    console.log('Inside list, users = ', users);
      callback(err, users);
    });
  },

  update : function (item, callback) {
    var context = this;
    this.model.findOne({_id : item.user_id}, function (err, doc) {
      //     console.log('Inside update: doc = ', doc);
      if (doc) {

        if (utils.isArray(item.domain)) {
          item.domain = _.uniq(item.domain);
          item.domain = item.domain.join(',').toLowerCase();
        }

        if (utils.isArray(item.companyId)) {
          item.companyId = item.companyId.join(',');
        }

        if (item.password) {
          var hash = utils.getHash(item.password);
          item.password = hash;
        }

        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        doc.updated_at = new Date();

        //       console.log('Inside update: updated doc = ', doc);
        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
            item.user_id = item._id;

            delete item._id;
            delete item.__v;
            delete item.validation;
            delete item.old_passwords;
          }
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  updateLastLoginAt : function (item, callback) {
    var context = this;
    this.model.findOne({_id : item.user_id}, function (err, doc) {
      //     console.log('Inside update: doc = ', doc);
      if (doc) {

        doc.last_login_at = new Date();
        doc.last_login_from = item.last_login_from;

        doc.save(function (err, item) {
          if (item) {
            item = utils.clone(item);
            item.user_id = item._id;

            delete item._id;
            delete item.__v;
            delete item.validation;
            delete item.old_passwords;
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
      callback(utils.buildError('400', 'No user ID passed to remove function'), null);
    }
  },

  getUsersUsesBillingPlan: function(billingPlanId, cb) {
    cb = cb || _.noop;
    this.get({
      billing_plan: billingPlanId,
      deleted: false
    }, cb);
  },

  //  ---------------------------------
  // free promise query
  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },

  // returns _promise_ { total: 000, active: 000, deleted: 000 }
  countUsers: function () {
    var res = { total: 0, active: 0, deleted: 0 };
    return promise.all([
        this.model.count({ $or: [{ deleted : { $exists: false } }, { deleted: false } ] }).exec(),
        this.model.count({}).exec()
      ])
      .then( function( c ) {
        res.active = c[0];
        res.total = c[1];
        res.deleted = res.total - res.active;
        return res;
      });
  },
  /**
   * @name cleanOneManagedAccountIdForAllResselers
   * @description method delete the account’s ID from field "companyId"
   * must not to be main Account Id (not first Account Id)
   *
   * @param {{String}}  accountId - Account Id
   */
  cleanOneManagedAccountIdForAllResselers: function(accountId, cb) {
    var context = this;
    if(_.isArray(accountId)){
     return cb(new Error('accountId must be String'));
    }
    var conditionsFind = { '$regex': ','+accountId/*not main Account Id*/ };
    var ops = [];
    this.model.find({
      companyId: conditionsFind
    }, function(err, docs) {
        if(err) {
          return cb(err);
        }
        var total = docs.length;
        docs.forEach(function(doc) {
          ops.push({
            'updateOne': {
              'filter': { '_id': doc._id },
              'update': { '$set': { 'companyId': doc.companyId.replace(',' + accountId, '') } }
            }
          });
          if(ops.length === 500) {
            context.model.collection.bulkWrite(ops);
            ops = [];
          }
        });
        if(ops.length > 0){
          context.model.collection.bulkWrite(ops);
        }
        cb(err, { total: total} );
      });
  },
  /**
   * @name cleanOneManagedDomainNameForAllUsers
   * @description method clean one domain name for all users
   */
  cleanOneManagedDomainNameForAllUsers: function(options, cb) {
    var domainName = options.domain_name;
    var context = this;
    var ops = [];
    if(!domainName) {
      return cb(new Error('Property domain_name not set'));
    }
    if(_.isArray(domainName)) {
      return cb(new Error('Property domain_name must be String'));
    }
    var conditionsFind = { '$regex': domainName};
    this.model.find({ domain: conditionsFind }, function(err, docs){
      if(err) {
        return cb(err);
      }
      var total = docs.length;
      docs.forEach(function(doc) {
        var domainList = _.filter(doc.domain.split(','), function(item){
          return item !== domainName;
        });
        ops.push({
          'updateOne': {
            'filter': { '_id': doc._id },
            'update': { '$set': { 'domain': domainList.join(',') } }
          }
        });
        if(ops.length === 500) {
          context.model.collection.bulkWrite(ops);
          ops = [];
        }
      });
      if(ops.length > 0) {
        context.model.collection.bulkWrite(ops);
      }
      cb(err, { total: total });
    });
  }
};

module.exports = User;

