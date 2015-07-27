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

var utils = require('../lib/utilities.js'),
  bcrypt = require('bcrypt'),
  merge = require('mongoose-merge-plugin');


function User(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.UserSchema = new this.Schema({
    'access_control_list': {
      dashBoard: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      configure:  { type: Boolean, default: true },
      test:  { type: Boolean, default: true },
      readOnly:  { type: Boolean, default: true },
    },
    'companyId': String,
    'domain': String,
    'email': String,
    'firstname': String,
    'lastname': String,
    'password': String,
    'role':  { type: String, default: 'user' },
    'status': { type: Boolean, default: true },
    'theme': { type: String, default: 'light' },
    'token': String,
    'created_at': { type: Date, default: Date() },
    'updated_at': { type: Date, default: Date() }
  });

  this.model = connection.model('User', this.UserSchema, 'User');
}

User.prototype = {

  // adds a new item
  add: function(item, callback) {

    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(item.password, salt);
    item.password = hash;

    new this.model(item).save(function(err, item) {
      console.log('Error = ', err);
      if (callback) {
        callback(err, item);
      }
    });
  },


  get: function(item, callback) {

    console.log('Inside get. item = ', item);

    this.model.findOne( item, function(err, doc) {
      console.log('Inside get. Received err = ', err);
      console.log('Inside get. Received doc = ', doc);
      if(doc) {   
        doc = utils.clone(doc);
        doc.user_id = doc._id;
        delete doc.__v;
        delete doc._id;
      }
      callback(err, doc);
    });
  }, 

  list: function(accountId, callback) {
    this.model.find( function (err, users) {
      if (users) {
        users = utils.clone(users);
        for (var i = 0; i < users.length; i++ ) {
          users[i].user_id = users[i]._id;
          delete users[i]._id; 
          delete users[i].__v; 
        }
      }
  //    console.log('Inside list, users = ', users);
      callback(err, users);
    });
  },

  update: function(item, callback) {
    var context = this;
    this.model.findOne( { _id: item.user_id }, function (err, doc) {
      console.log('Inside update: doc = ', doc);
      if (doc) {
        for (var attrname in item) { doc[attrname] = item[attrname]; }
        doc.updated_at = new Date();
        console.log('Inside update: updated doc = ', doc);
        doc.save(function(err, item) {
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

  remove: function(item, callback) {
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
      callback( utils.buildError('400','No user ID passed to remove function'), null );
    }
  }

};


exports.User = User;
