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

var config = require('config');
var mongoose = require('mongoose');
var boom = require('boom');
var AuditLogger = require('../lib/audit');
var uuid = require('node-uuid');
var Promise = require('bluebird');
var logger = require('revsw-logger')(config.log_config);

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');
var dnsResolve = require('../lib/dnsResolve.js');
var DNSZone = require('../models/DNSZone');
var User = require('../models/User');
var utils = require('../lib/utilities.js');
var _ = require('lodash');

var dnsZones = Promise.promisifyAll(new DNSZone(mongoose, mongoConnection.getConnectionPortal()));
var permissionCheck = require('./../lib/requestPermissionScope');
var Nsone = require('../lib/nsone.js');

var DNS_ZONE_NOT_FOUND = 'DNS zone not found';

var ERROR_UNHANDLED_INTERNAL_SERVER_ERROR = 'Unhandled Internal Server Error';
var ERROR_DNS_SERVICE_UNABLE = 'The DNS service is currently unable to process your request. Please try again later.';

/**
 * @name  getDnsZonesStatsUsageZone
 * @description Statistics and graphs for the entire Zone over a given period
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
module.exports.getDnsZonesStatsUsageZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var foundDnsZone;
  var filterPeriod = request.query.period || '1h';
  var intervalSec = 3 * 60;
  // NOTE: default interval for period
  switch (filterPeriod){
    case '1h':
      intervalSec = 3 * 60; // 3 min
      break;
    case '24h':
      intervalSec = 3 * 60 * 60; // 30 min
      break;
    case '30d':
      intervalSec = 12 * 60 * 60; // 14 hours
      break;
  }
  Promise.resolve()
    .then(function() {
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zone')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return true;
      }
    })
    // make request to NSONE
    .then(function() {
      return Nsone.getDnsZonesStatsUsageZone(foundDnsZone.zone, { period: filterPeriod })
        .then(function(data) {
        return data[0];
      });
    })
  .then(function(response) {
      var statUsageInfo = response;
      var from = (statUsageInfo.graph.length!==0)? statUsageInfo.graph[0][0] * 1000 : null;
      var to = (statUsageInfo.graph.length!==0)?statUsageInfo.graph[statUsageInfo.graph.length - 1][0] * 1000: null;
      response = {
        metadata: {
          zone: foundDnsZone.zone,
          account_id: foundDnsZone.account_id,
          period: response.period,
          queries: response.queries,
          records: response.records,
          interval_sec: intervalSec,
          from: from,
          from_datetime: new Date(from),
          to: to,
          to_datetime: new Date(to)
        },
        data: _.map(statUsageInfo.graph, function(item) {
          if (_.isArray(item) === true) {
            return [item[0]*1000, item[1]];
          } else {
            return item;
          }
        })
      };
      reply(response);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          return reply(boom.badImplementation(error.message));
        }
      } else {
        return reply(boom.badImplementation('getDnsZonesStatsUsageZone:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};
