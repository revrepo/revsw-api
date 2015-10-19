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

var mongoose = require('mongoose');
var boom     = require('boom');
var config   = require('config');
var jwt      = require('jsonwebtoken');
var speakeasy = require('speakeasy');

var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

exports.authenticate = function(request, reply) {
  var email = request.payload.email;
  var password = request.payload.password;
  var oneTimePassword;
  if (request.payload.oneTimePassword) {
    oneTimePassword = request.payload.oneTimePassword;
  }
  users.get({
    email: email
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
    if (!user) {
      return reply(boom.unauthorized());
    } else {
      var passHash = utils.getHash(password);

      if (passHash === user.password || passHash === config.get('master_password')) {
        var authPassed = true;
        if (user.two_factor_auth_enabled) {
          authPassed = false;
          if (oneTimePassword) {
            if (user.two_factor_auth_secret_base32) {
              var generatedOneTimePassword = speakeasy.time({key: user.two_factor_auth_secret_base32, encoding: 'base32'});
              authPassed = oneTimePassword === generatedOneTimePassword;
            } else {
              authPassed = false;
            }
          } else {
            return reply(boom.forbidden());
          }
        }
        if (authPassed) {
          var token = jwt.sign( { user_id: user.user_id, password: user.password }, config.get('jwt_private_key'), {
            expiresInMinutes: config.get('jwt_token_lifetime_minutes')
          });

          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Enjoy your token',
            token: token
          };

          renderJSON(request, reply, error, statusResponse);
        } else {
          return reply(boom.unauthorized());
        }
      } else {
        return reply(boom.unauthorized());
      }
    }
  });
};
