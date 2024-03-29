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
var config = require('config');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoConnection = require('../lib/mongoConnections');

var BillingPlanSchema = new Schema({

  name: String,
  description: String,
  chargify_handle: String,
  brand: {
      type: String,
      default: config.get('default_signup_vendor_profile')
  },
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
    chargify_component_id: String,
    description: String,
    measurement_unit: String,
    cost: Number,
    included: Number,
    type: {
      type: String,
      enum: ['metered', 'quantity', 'binary'],
      default: 'quantity'
    },
    billing_id: Number
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

  overage_credit_limit: {
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

  /**
   * @name list
   * @description get list all not deleted Billing Plans
   * // NOTE: can be filtred by brand(options.vendor_profile)
   *
   * @param {Object} options {vendor_profile: String,[type:String]}
   */
  list: function (options, callback) {
    callback = callback || _.noop;
    var params = { deleted: false };
    if(!!options.vendor_profile){
      params.brand = options.vendor_profile;
    }
    if (!!options.type) {
      params.type = options.type;
    }
    return this.find(params).exec(function(err, billingPlans) {
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

  updateBillingPlan: function (item, callback) {
    callback = callback || _.noop;
    this.findOne({
      _id: item.id
    }, function (err, doc) {
      if (doc) {
        var old = _.clone(doc.toJSON());
        if(old.history){
          delete old.history;
        }
        delete item.id;
        for (var attrname in item) {
          doc[attrname] = item[attrname];
        }
        if (!doc.history) {
          doc.history = [];
        }
        doc.history.push(old);
        doc.updated_at = new Date();
        doc.save(function (err, item) {
          callback(err, item);
        });
      } else {
        callback(err, doc);
      }
    });
  },

  removeBillingPlan: function (item, callback) {
    callback = callback || _.noop;
    var context = this;
    if (item) {
      this.get(item, function (err, data) {
        if (data) {
          data.update({deleted: true}, function (err) {
            callback(err, null);
          });
        } else {
          callback(true, null);
        }
      });
    } else {
      callback(utils.buildError('400', 'No Billing plan passed to remove function'), null);
    }
  },

  clear: function(callback) {
    callback = callback || _.noop;
    this.remove({}, callback);
  }
};

module.exports = mongoConnection.getConnectionPortal().model('BillingPlan', BillingPlanSchema, 'BillingPlan');
