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

  this.AccountSchema = new this.Schema({
    'companyName': String,
    'status': Boolean,
    'createdBy': String,
    'id': String,
    'created_at': { type: Date, default: Date() },
    'updated_at': { type: Date, default: Date() }
  });

  this.model = connection.model('Company', this.AccountSchema, 'Company');
}

Account.prototype = {

  list: function(request, callback) {

    console.log('Inside line. Object request.auth.credentials = ', request.auth.credentials);

    this.model.find( { companyId: request.auth.credentials.companyId },  function (err, users) {
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
