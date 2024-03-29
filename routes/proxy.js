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

var Joi = require('joi');
var _ = require('lodash');
var config = require('config');
var boom = require('boom');

var proxyWhiteRefererURLs = config.get('proxy_white_referer_urls');

module.exports = [{
  method: 'GET',
  path: '/v1/curl',
  config: {
    auth: false,
    description: 'Proxy for custom urls',
    notes: 'Use this function for proxy call custom urls',
  },
  handler: {
    proxy: {
      mapUri: function(request, callback) {
        var referer = request.headers.referer;
        if (_.find(proxyWhiteRefererURLs, function(item) {
            var hostRegExp = new RegExp(item);
            return hostRegExp.test(referer);
          })) {
          var url = request.query.url || 'https://www.statuspage.io/';
          callback(null, url);
        } else {
          callback(boom.badRequest());
        }
      }
    }
  }
}];
