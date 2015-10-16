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
      readOnly  : {type : Boolean, default : false},
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
    'two_factor_auth_secret_base32': String
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
//      console.log('Error = ', err);
      if (callback) {
        callback(err, item);
      }
    });
  },

  get : function (item, callback) {

    //   console.log('Inside get. item = ', item);

    this.model.findOne(item, function (err, doc) {
      //     console.log('Inside get. Received err = ', err);
      //     console.log('Inside get. Received doc = ', doc);
      if (doc) {
        doc = utils.clone(doc);
        doc.user_id = doc._id;
        delete doc.__v;
        delete doc._id;
        delete doc.token;
        delete doc.status;
        delete doc.id;
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

  list : function (request, callback) {

//    console.log('Inside line. Object request.auth.credentials = ', request.auth.credentials);

    this.model.find(function (err, users) {
      if (users) {

        users = utils.clone(users);
        for (var i = 0; i < users.length; i++) {

          // remove from the resulting array users without companyId property (most likely RevAdmin/system users)
          if (!users[i].companyId) {
            users.splice(i, 1);
            i--;
            continue;
          }

          if (request.auth.credentials.role !== 'reseller' && users[i].role === 'reseller') {
            users.splice(i, 1);
            i--;
            continue;
          }

          users[i].companyId = users[i].companyId.split(',');

          // skip users which do not belong to the company
          if (utils.areOverlappingArrays(users[i].companyId, request.auth.credentials.companyId)) {
            users[i].user_id = users[i]._id;
            delete users[i]._id;
            delete users[i].__v;
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
      callback(utils.buildError('400', 'No user ID passed to remove function'), null);
    }
  }

};

module.exports = User;
