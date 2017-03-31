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


module.exports = [{
  method: 'GET',
  path: '/curl',
  config: {
    auth: {
      scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
    },
    description: 'Proxy for custom urls',
    notes: 'Use this function for proxy call custom urls',
  },
  handler: {
    proxy: {
      mapUri: function (request, callback) {
        var url = request.query.url || 'https://www.statuspage.io/';
        callback(null, url);
      }
    }
  }
}];
