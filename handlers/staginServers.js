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
var async = require('async');
var mongoose = require('mongoose');
var boom = require('boom');
var config = require('config');
var mongoConnection = require('../lib/mongoConnections');
var cds_request = require('request');
var renderJSON = require('../lib/renderJSON');
var _ = require('lodash');
var utils = require('../lib/utilities.js');
var BP_GROUP_ID_DEFAULT_ = config.get('bp_group_id_default');

var Account = require('../models/Account');
var ServerGroup = require('../models/ServerGroup');

var servergroups = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
/**
 * @name  getStaginServers
 * @description
 *   Get list (array) of Proxy Servers with:
 *    1. environment=staging
 *    2. status: 'online'
 *    3. in servers staging in Server Group equal Account`s bp_group_id
 * @param  {[type]} request
 * @param  {[type]} reply
 * @return {[type]}
 */
exports.getStaginServers = function(request, reply) {
  var accountId = request.query.account_id;
  var proxyServerResponseJSONData;
  // NOTE: main workflow
  async.auto({
    parentAccountId: function(cb) {
      var parentAccountId = utils.getAccountID(request, true);
      if (!!accountId && !utils.checkUserAccessPermissionToAccount(request, accountId)) {
        return cb(boom.badRequest('Account ID not found'));
      } else {
        if (!!accountId) {
          parentAccountId = accountId;
        }
      }
      cb(null, parentAccountId);
    },
    bpGroupId: function(cb, result) {
      if (request.auth.credentials.role === 'revadmin' && !result.parentAccountId) {
        cb();
      } else {
        accounts.get({
          _id: result.parentAccountId
        }, function(err, accountData) {
          if (err || !accountData) {
            return cb(boom.badImplementation('Account not found'));
          }
          if (!accountData.bp_group_id) {
            // NOTE: set default BP Group Id
            accountData.bp_group_id = BP_GROUP_ID_DEFAULT_;
          }
          cb(err, accountData.bp_group_id);
        });
      }
    },
    accountBPStagingServers: ['bpGroupId', function(cb, result) {
      var bpGroupId = result.bpGroupId || BP_GROUP_ID_DEFAULT_;
      servergroups.get({
        _id: bpGroupId
      }, function(error, serverGroupData) {
        if (error) {
          return cb(boom.badImplementation('Failed to retrive from the database a list of BP server'));
        }
        if (serverGroupData) {
          serverGroupData = serverGroupData.toJSON();
          cb(null, serverGroupData.servers_staging || []);
        } else {
          return cb(boom.badRequest('No Staging Server is registered in the system'));
        }
      });
    }],
    stagingProxyServers: function(cb) {
      var authHeader = {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      };
      var options = '?environment=staging';

      cds_request({
        url: config.get('cds_url') + '/v1/proxy_servers' + options,
        headers: authHeader
      }, function(err, res, body) {
        if (err) {
          return cb(boom.badImplementation('Failed to get the Proxy Servers with environment equal "staging"'));
        }
        proxyServerResponseJSONData = JSON.parse(body);
        if (res.statusCode === 400) {
          return cb(boom.badRequest(proxyServerResponseJSONData.message));
        } else if (res.statusCode === 500) {
          return cb(boom.badImplementation(proxyServerResponseJSONData.message));
        } else {
          proxyServerResponseJSONData = _.filter(proxyServerResponseJSONData, {
            status: 'online'
          }).map(function(proxyServer) {
            var staginServer = {
              server_ip: proxyServer.server_ip,
              server_name: proxyServer.server_name
            };
            return staginServer;
          });
          cb(null, proxyServerResponseJSONData);
        }
      });
    }
  }, function(err, result) {
    if (err) {
      if (err.isBoom) {
        return reply(err);
      }
      return reply(boom.badImplementation(err.message));
    }
    var response = _.filter(result.stagingProxyServers, function(item) {
      return result.accountBPStagingServers.indexOf(item.server_name) > -1;
    });
    // return reply(response);
    renderJSON(request, reply, err, response);
  });
};
