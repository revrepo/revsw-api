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

var handler = require('../handlers/chargify');
var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method : 'POST',
    path   : '/webhooks/chargify',
    config : {
      handler     : handler.webhookHandler,
      auth        : 'hmac',
     payload: {
        parse: true,
        allow: 'application/x-www-form-urlencoded'
      },
      plugins: {
        'hapi-swagger' : {
          responseMessages : routeModels.standardHTTPErrors
        }
      },
      description : 'Chargify webhook',
    }
  }
];
