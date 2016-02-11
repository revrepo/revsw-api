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
var _ = require('lodash');

var User = require('../models/User');
var BillingPlan = require('../models/BillingPlan');

var api_key = config.get('chargify_key');
var password = config.get('chargify_password');
var password = config.get('chargify_domain');
var Promise = require('bluebird');

exports.Product =  {

  getByHandle: function (handle, cb) {
    request
      .get(domain + '/products/handle/' + handle)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function (err, res) {
        if(err){
          console.log(err)
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
      console.log(pages);
      if(pages && pages.length <= 0){
        err = new Error('No hosted pages registered for this product');
        return cb(err, null);
      }
      return cb(null, pages[0]);
    })
  }

};

