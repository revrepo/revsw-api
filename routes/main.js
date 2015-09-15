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

"use strict";

var Joi = require('joi');

var main = require('../handlers/main');

module.exports = [
  {
    method: 'GET',
    path: '/',
    config: {
      auth: false,
      handler: main.index
    }
  }, {
    method: 'GET',
    path: '/images/{file*}',
    config: {
      auth: false
    },
    handler: {
      directory: {
        path: './node_modules/hapi-swagger/public/swaggerui/images'
      }
    }
  }, {
    method: 'GET',
    path: '/{path*}',
    config: {
      auth: false
    },
    handler: {
      directory: {
        path: './public',
        listing: false,
        index: true
      }
    }
  }
];
