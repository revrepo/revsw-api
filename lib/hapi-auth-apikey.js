/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

var Boom = require('boom');
var Hoek = require('hoek');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

// Declare internals

var internals = {};

exports.register = function (server, options, next) {
  server.auth.scheme('apikey', internals.implementation);
  next();
};

exports.register.attributes = {
  name: 'hapi-auth-apikey'
};

internals.implementation = function (server, options) {

  Hoek.assert(options, 'Missing API key auth strategy options');

  var scheme = {
    authenticate: function (request, reply) {
      var req = request.raw.req;
      var authorization = req.headers.authorization;
      if (!authorization) {
        logger.debug('Missing Authorization header');
        return reply(Boom.unauthorized(null, 'X-API-KEY'));
      }
      var parts = authorization.split(/\s+/);
      if (parts.length !== 2) {
        return reply(Boom.badRequest('Bad HTTP authentication header format', 'X-API-KEY'));
      }
      if (parts[0].toUpperCase() !== 'X-API-KEY') {
        return reply(Boom.unauthorized(null, 'X-API-KEY'));
      }
      //if(parts[1].split('.').length !== 3) {
      //  return reply(Boom.badRequest('Bad HTTP authentication header format', 'X-API-KEY'));
      //}
      var key = parts[1];
      options.validateFunc(request, key, function (err, isValid, credentials) {
        credentials = credentials || null;
        if (err) {
          return reply(err, null, {credentials: credentials});
        }
        if (!isValid) {
          return reply(Boom.unauthorized('Invalid API key', 'X-API-KEY'), null, {credentials: credentials});
        }
        if (!credentials) {
          return reply(Boom.badImplementation('Bad credentials object received for API key auth validation'), null, {log: {tags: 'credentials'}});
        }
        // Authenticated
        return reply.continue({credentials: credentials});
      });
    }
  };

  return scheme;
};
