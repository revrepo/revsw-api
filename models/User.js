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
var _ = require('lodash');

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
    'companyId'            : String,
    'domain'               : String,
    'email'                : String,
    'firstname'            : String,
    'lastname'             : String,
    'password'             : String,
    'role'                 : {type : String, default : 'user'},
    'status'               : {type : Boolean, default : true},
    'theme'                : {type : String, default : 'light'},
    'token'                : String,
    'created_at'           : {type : Date, default : Date()},
    'updated_at'           : {type : Date, default : Date()},
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

    validation: {
      expiredAt: Date,
      token: String,
      verified: {type: Boolean, default: false}
    },

    billing_plan: this.ObjectId,

    deleted: { type: Boolean, default: false }

  });

  this.model = connection.model('User', this.UserSchema, 'User');
}

User.prototype = {

  // adds a new item
  add : function (item, callback) {

    var hash = utils.getHash(item.password);
    item.password = hash;

    if (utils.isArray(item.domain)) {
      item.domain = item.domain.join(',');
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
          doc.domain = doc.domain.split(',');
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
          doc.domain = doc.domain.split(',');
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
          doc.domain = doc.domain.split(',');
        } else {
          doc.domain = [];
        }

      }
      callback(err, doc);
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

  list : function (request, callback) {

//    console.log('Inside line. Object request.auth.credentials = ', request.auth.credentials);

    this.model.find(function (err, users) {
      if (users) {

        users = utils.clone(users);
        for (var i = 0; i < users.length; i++) {

          // remove from the resulting array users without companyId property (most likely RevAdmin/system users)
          if (request.auth.credentials.role !== 'revadmin' && (!users[i].companyId)) {
            users.splice(i, 1);
            i--;
            continue;
          }

          if (request.auth.credentials.role !== 'revadmin' && (request.auth.credentials.role !== 'reseller' && users[i].role === 'reseller')) {
            users.splice(i, 1);
            i--;
            continue;
          }
          if (users[i].companyId) {
            users[i].companyId = users[i].companyId.split(',');
          } else {
            users[i].companyId = [];
          }

          // skip users which do not belong to the company
          if (request.auth.credentials.role === 'revadmin' || utils.areOverlappingArrays(users[i].companyId, request.auth.credentials.companyId)) {
            users[i].user_id = users[i]._id;
            users[i].two_factor_auth_enabled = users[i].two_factor_auth_enabled || false;
            delete users[i]._id;
            delete users[i].__v;
            delete users[i].validation;
            delete users[i].old_passwords;

            if (users[i].domain && users[i].domain !== '') {
              users[i].domain = users[i].domain.split(',');
            } else {
              users[i].domain = [];
            }
          } else {
            users.splice(i, 1);
            i--;
          }
        }
      }
      //    console.log('Inside list, users = ', users);
      callback(err, users);
    });
  },

  listAll : function (request, callback) {

    this.model.find(function (err, users) {
      if (users) {
        users = utils.clone(users);

        for (var i = 0; i < users.length; i++) {
          users[i].companyId = users[i].companyId ? users[i].companyId.split(',') : '';
          users[i].user_id   = users[i]._id;

          delete users[i]._id;
          delete users[i].__v;
          delete users[i].validation;
          delete users[i].old_passwords;

          if (users[i].domain && users[i].domain !== '') {
            users[i].domain = users[i].domain.split(',');
          } else {
            users[i].domain = [];
          }
        }
      }
      callback(err, users);
    });
  },

  update : function (item, callback) {
    var context = this;
    this.model.findOne({_id : item.user_id}, function (err, doc) {
      //     console.log('Inside update: doc = ', doc);
      if (doc) {

        if (utils.isArray(item.domain)) {
          item.domain = item.domain.join(',');
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
  }

};

module.exports = User;
