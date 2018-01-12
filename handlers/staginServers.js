/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

var boom = require('boom');
var config = require('config');
var cds_request = require('request');
var renderJSON = require('../lib/renderJSON');
var _ = require('lodash');

/**
 * @name  getStaginServers
 * @description
 *   Get list (array) of Proxy Servers with:
 *    1. environment=staging
 *    2. status: 'online'
 * @param  {[type]} request
 * @param  {[type]} reply
 * @return {[type]}
 */
exports.getStaginServers = function(request, reply) {
  var authHeader = {
    Authorization: 'Bearer ' + config.get('cds_api_token')
  };
  var options = '?environment=staging';

  cds_request({
    url: config.get('cds_url') + '/v1/proxy_servers' + options,
    headers: authHeader
  }, function(err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get the Proxy Servers with environment equal "staging"'));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else {
      response_json = _.filter(response_json, {
        status: 'online'
      }).map(function(proxyServer) {
        var staginServer = {
          server_ip: proxyServer.server_ip,
          server_name: proxyServer.server_name
        };
        return staginServer;
      });
      renderJSON(request, reply, err, response_json);
    }
  });
};
