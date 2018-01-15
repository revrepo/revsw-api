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

// TODO: need to fix the SSL cert on infra.revsw.net and after that
// remove the ugly line from here
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var boom = require('boom');
var promise = require('bluebird');
var config = require('config');
var infra_request = require('request');
var renderJSON = require('../lib/renderJSON');
var _ = require('lodash');
var logger = require('revsw-logger')(config.log_config);
var base64 = require('js-base64').Base64;
var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
  store: 'memory',
  max: config.get('cache_memory_max_bytes'),
  ttl: config.get('cache_memory_ttl_seconds') /*seconds*/ ,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);
/**
 * @name  getServersIPList
 * @description
 *
 * @param  {[type]} request
 * @param  {[type]} reply
 * @return {[type]}
 */

exports.getServersIPList = function(request, reply) {
  var authHeader = {
    Authorization: 'Basic ' + base64.encode(config.get('infra_db_login_name') + ':' + config.get('infra_db_password'))
  };
  var isCache = true;
  var cacheKey = 'getServersIPList:' + config.get('infra_db_serve_list_url') + '/api/servers_list';
  memoryCache.wrap(cacheKey, function(cb) {
    isCache = false;
    infra_request({
      url: config.get('infra_db_serve_list_url') + '/api/servers_list',
      headers: authHeader
    }, function(err, res, body) {
      if (err) {
        return cb(err);
        // return reply(boom.badImplementation('Failed to get data from "InfraDB"'));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return cb(res);
        // return reply(boom.badRequest(response_json.message));
      } else if (res.statusCode === 500) {
        cb(res);
        // return reply(boom.badImplementation(response_json.message));
      } else {
        var response = {
          edge_blocks: [],
          log_shipping_blocks: []
        };

        _.each(response_json, function(item) {
          var ip_ = item.IP.split('.');
          var serverIP_;
          if (ip_.length === 4) {
            ip_[3] = '0/24';
            serverIP_ = ip_.join('.');
          } else {
            return;
          }
          switch (item.type) {
            case 'BP':
              response.edge_blocks.push(serverIP_);
              break;
            case 'LS':
              response.log_shipping_blocks.push(serverIP_);
              break;
            case 'MONITOR':
              response.log_shipping_blocks.push(serverIP_);
              break;
          }
        });
        // NOTE: simple sort IP
        var ipCompoare = function ipCompore(ip1, ip2) {
          var ipArray1 = ip1.split('.');
          var ipArray2 = ip2.split('.');
          return parseInt(ipArray1[0]) - parseInt(ipArray2[0]);
        };
        response.edge_blocks = _.uniq(response.edge_blocks).sort(ipCompoare);
        response.log_shipping_blocks = _.uniq(response.log_shipping_blocks).sort(ipCompoare);
        cb(null, response);
      }
    });
  }, {
    ttl: 360000
  }, function(err, response) {
    if (isCache) {
      logger.info('getServersIPList:return cache for key - ' + cacheKey);
    }
    if (err) {
      if (!!err.statusCode && err.statusCode === 400) {
        return reply(boom.badRequest(err.message));
      } else if (!!err.statusCode && err.statusCode === 500) {
        return reply(boom.badImplementation(err.message));
      }
      return reply(boom.badImplementation('Failed to get data from "InfraDB"'));
    }
    renderJSON(request, reply, err, response);
  });
};
