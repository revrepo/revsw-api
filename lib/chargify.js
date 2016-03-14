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
'use strict';

var request = require('superagent');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');

var User = require('../models/User');
var BillingPlan = require('../models/BillingPlan');

var chargifyConfig = config.get('chargify');
var password = chargifyConfig.password;
var domain = chargifyConfig.domain;
var api_key = chargifyConfig.api_key;
var Promise = require('bluebird');

Promise.promisifyAll(BillingPlan);

exports.Product =  {

  getByHandle: function (handle, cb) {
    request
      .get(domain + '/products/handle/' + handle)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        return cb(null, res.body.product);
      });
  },

  getHostedPage: function (handle, cb) {
    this.getByHandle(handle, function (err, res) {
      if(err){
        return cb(err, null);
      }
      var pages = res.public_signup_pages;
      if(pages && pages.length <= 0){
        err = new Error('No hosted pages registered for this product');
        return cb(err, null);
      }
      return cb(null, pages[0]);
    });
  }
};
exports.Customer = {
  getCustomerBySubscriptionId: function (subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/products/handle/' + subscriptionId)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        return cb(null, res.body.customer);
      });
  },
  /**
   *
   * @param customerId
   * @param cb
   */
  getBillingPortalLink: function (customerId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/portal/customers/' + customerId + '/management_link')
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },
  getTransactions: function (subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/subscriptions/' + subscriptionId + '/transactions')
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        res.body = res.body.map(function (el) {
          return el.transaction;
        });
        return cb(null, res.body);
      });
  },
  getStatements: function (subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/subscriptions/' + subscriptionId + '/statements')
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        res.body = res.body.map(function (el) {
          return el.statement;
        });
        return cb(null, res.body);
      });
  },
  getStatement: function (id, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/statements/' + id)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        return cb(null, res.body.statement);
      });
  },
  getPdfStatement: function (id, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/statements/' + id + '.pdf')
      .auth(api_key, password)
      .type('application/json')
      .accept('application/pdf')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        var data = '';

        res.setEncoding('binary');
        res.on('data', function (chunk) {
          res.data += chunk;
        });
        res.on('end', function () {
          return cb(null, new Buffer(res.data, 'binary'));
        });
      });
  },
  updateSubscription: function (subscriptionId, data, cb) {
    cb = cb || _.noop;
    request
      .put(domain + '/subscriptions/' + subscriptionId)
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },
  updatePaymentProfile: function (subscriptionId, account, cb) {
    cb = cb || _.noop;
    var info = account.billing_info;
    if(!info){
      return cb('Missing billing info', null);
    }
    var data = {
      subscription: {
        payment_profile_attributes: {
          billing_address: info.address1 ? info.address1 : '',
          billing_address_2: info.address2 ? info.address2 : '',
          billing_country: info.country ? info.country : '',
          billing_state: info.state ? info.state : '',
          billing_city: info.city ? info.city : '',
          billing_zip: info.zipcode ? info.zipcode : ''
        }
      }
    };
    this.updateSubscription(subscriptionId, data, cb);
  },
  /**
   * Allocate resource using Chargify
   * @param subscriptionId
   * @param component_id
   * @param quantity
   * @param cb
   */
  allocateResource: function (subscriptionId, component_id, quantity, cb) {
    cb = cb || _.noop;
    var data = {
      allocation: {
        quantity: quantity
      }
    };
    request
      .post(domain + '/subscriptions/' + subscriptionId + '/components/' + component_id + '/allocations')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });


  },
  changeProduct: function (subscriptionId, handle, cb) {
    var updateSubscription = Promise.promisify(this.updateSubscription);
    var allocateResource = Promise.promisify(this.allocateResource);
    cb = cb || _.noop;
    if(!handle){
      cb('No product handle provided', null);
    }
    var data = {subscription: {product_handle: handle}};
    updateSubscription(subscriptionId, data)
      .then(function () {
        return BillingPlan.findOneAsync({chargify_handle: handle});
      })
      .then(function (plan) {
        return Promise.map(plan.services, function (service) {
          return allocateResource(subscriptionId, service.chargify_id, service.included);
        });
      })
      .then(function () {
        cb(null, true);
      })
      .catch(function (err) {
        cb(err, null);
      });
  },
  cancelSubscription: function (subscriptionId, cb) {
    cb = cb || _.noop;
    var data = {
      subscription: {cancellation_message: 'Canceled via User API'}
    };
    request
      .delete(domain + '/subscriptions/' + subscriptionId)
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  }

};

