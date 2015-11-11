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
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoConnection = require('../lib/mongoConnections');

var BillingPlanSchema = new Schema({

  name: String,
  description: String,

  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  monthly_fee: {
    type: Number,
    default: 0
  },
  services: [{
    code_name: String,
    description: String,
    measure_unit: String,
    cost: Number,
    included: Number
  }],
  prepay_discounts: [{
    period: Number,
    discount: Number
  }],
  commitment_discounts: [{
    period: Number,
    discount: Number
  }],
  order: Number,
  deleted: {
    type: Boolean,
    default: false
  },

  history: [{}],

  overage_credit_linit: {
    type: Number,
    default: 0
  }

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

/**
 * Overwrite / addd methods to fetched record
 *
 * @type {*}
 */
BillingPlanSchema.methods = {

  toJSON: function() {
    var obj = this.toObject();
    obj.id = obj._id + '';

    delete obj.__v;
    delete obj._id;
    if (obj.services && _.isArray(obj.services)) {
      for(var i = 0; i < obj.services.length; i++) {
        delete obj.services[i]._id;
      }
    }
    if (obj.prepay_discounts && _.isArray(obj.prepay_discounts)) {
      for(var j = 0; j < obj.prepay_discounts.length; j++) {
        delete obj.prepay_discounts[j]._id;
      }
    }
    return obj;
  }
};

/**
 * List of methods that will be available into Model
 *
 * @type {*}
 */
BillingPlanSchema.statics = {

  get: function (item, callback) {
    callback = callback || _.noop;
    this.findOne(item, callback);
  },

  add: function (item, callback) {
    callback = callback || _.noop;
    this.create(item, callback);
  },

  list: function (request, callback) {
    callback = callback || _.noop;
    return this.find().exec(function(err, billingPlans) {
      if (err) {
        return callback(err);
      }
      if (!_.isArray(billingPlans)) {
        return callback(new Error('Wrong data loaded from Mongo'));
      }
      var result = [];
      var length = billingPlans.length;
      for(var i = 0; i < length; i++) {
        result.push(billingPlans[i].toJSON());
      }
      return callback(null, result);
    });
  },

  update: function (item, callback) {
    callback = callback || _.noop;
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
    callback = callback || _.noop;
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

  clear: function(callback) {
    callback = callback || _.noop;
    this.remove({}, callback);
  }
};

module.exports = mongoConnection.getConnectionPortal().model('BillingPlan', BillingPlanSchema, 'BillingPlan');
