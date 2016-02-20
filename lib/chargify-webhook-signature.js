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

var qs = require('qs');
var Boom = require('boom');
var _ = require('lodash');

var config = require('config');
var chargifyConfig = config.get('chargify');
var crypto = require('crypto');

var internals = {};

exports.register = function (server, options, next) {
  server.auth.scheme('signature', internals.implementation);
  next();
};

exports.register.attributes = {
  name: 'chargify-webhook-signature'
};

internals.implementation = function (server, options) {

  var scheme = {

    authenticate: function (request, reply) {

      if (!request.headers['x-chargify-webhook-id']) {
        return reply(Boom.unauthorized('Chargify webhook id is missing from headers'));
      }
      if (!request.headers['x-chargify-webhook-signature-hmac-sha-256']) {
        return reply(Boom.unauthorized('Chargify webhook signature is missing from headers'));
      }
        return reply.continue({ credentials: {webhook: request.headers['x-chargify-webhook-id']}});
    },

    payload: function (request, reply) {

      var key = chargifyConfig.shared_key;
      var hmac = crypto.createHmac('sha256', key);

      var headers = request.headers;
      var id = headers['x-chargify-webhook-id'];
      var signature = headers['x-chargify-webhook-signature-hmac-sha-256'];

      hmac.update(qs.stringify(request.payload, { encode: false }));
      var hmacHex = hmac.digest('hex');

      if(hmacHex === signature) {
        return reply.continue({ credentials: {webhook: id}});
      } else {
        return reply(Boom.unauthorized('Signature mismatch'));
      }
    },

    options: {
      payload: true
    }
  };

  return scheme;
};