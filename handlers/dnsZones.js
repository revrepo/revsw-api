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

var DNSUser = require('../models/DNSUser');
var User = require('../models/User');
var utils = require('../lib/utilities.js');

var dnsUsers = Promise.promisifyAll(new DNSUser(mongoose, mongoConnection.getConnectionPortal()));

var NS1 = require('ns1');
NS1.set_api_key(config.get('nsone_api_key'));

exports.getDnsZones = function(request, reply) {
  var accountIds = utils.getAccountID(request);
  dnsUsers.accountListZones(accountIds, function (error, zones) {
    renderJSON(request, reply, error, zones);
  });
};

exports.createDnsZone = function(request, reply) {
  var payload = request.payload;
  var accountId = payload.account_id;
  var dnsZone = payload.dns_zone;

  var statusResponse = {
    statusCode: 200,
    message: 'Successfully created a new dns zone'
  };

  return Promise.try(function() {
    // Check account access
    if (!utils.checkUserAccessPermissionToAccount(request, accountId)) {
      throw new Error('Account ID not found');
    }

    return dnsUsers.getByZoneAsync(dnsZone);
  })
    .then(function(dnsUser) {
      // Check if dns_zone owned by any user
      if (dnsUser) {
        throw new Error('DNS Zone is unavailable');
      }

      return NS1.Zone.find(dnsZone)
        .then(function(zone) {
          throw new Error('DNS Zone is unavailable');
        })
        .catch(function(error) {
          return true;
        });
    })
    .then(function() {
      return NS1.Zone.create({zone: dnsZone})
        .then(function(zone) {
          return zone;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneZone) {
      if (nsoneZone) {
        return dnsUsers.getAsync(accountId);
      } else {
        throw new Error('Error on create NS1 Zone');
      }
    })
    .then(function(dnsUser) {
      if (dnsUser) {
        dnsUser.zones.push(dnsZone);
        return dnsUsers.updateAsync(dnsUser);
      } else {
        payload.zones = [dnsZone];
        return dnsUsers.addAsync(payload);
      }
    })
    .then(function(result) {
      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      // Process NS1 Errors
      if (/NS1 API Request Failed on/.test(error.message)) {
        if (/Input validation failed/.test(error.message)) {
          return reply('Invalid DNS Zone provided');
        }
      } else {
        if (/NS1 Zone/.test(error.message)) {
          return reply(boom.badImplementation('DNS Service unable to process your request now, try again later'));
        } else {
          return reply(boom.badRequest(error.message));
        }
      }
    });
};

exports.deleteDnsZone = function(request, reply) {
  var dnsZone = request.params.dns_zone;
  var foundDnsUser;

  var statusResponse = {
    statusCode: 200,
    message: 'Successfully deleted a new dns zone'
  };

  return Promise.try(function() {
    return dnsUsers.getByZoneAsync(dnsZone);
  })
    .then(function(dnsUser) {
      // Check if dns_zone owned by any user
      if (!dnsUser) {
        throw new Error('DNS Zone does not exists');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToAccount(request, dnsUser.account_id)) {
          throw new Error('Account ID not found');
        } else {
          foundDnsUser = dnsUser;
          return true;
        }
      }
    })
    .then(function() {
      return NS1.Zone.find(dnsZone)
        .then(function(zone) {
          zone.destroy()
            .then(function() {
              return true;
            })
            .catch(function(error){
              throw new Error('DNS Zone cannot be deleted');
            });
        })
        .catch(function(error) {
          throw new Error('DNS Zone does not exists');
        });
    })
    .then(function() {
      var dnsZonesLen = foundDnsUser.zones.length;
      var dnsZoneIndex = foundDnsUser.zones.indexOf(dnsZone);

      if (dnsZoneIndex !== -1) {
        foundDnsUser.zones.splice(dnsZoneIndex, 1);
      }
      if (dnsZonesLen === foundDnsUser.zones.length) {
        throw new Error('DNS Zone is not deleted properly');
      }
    })
    .then(function() {
      return dnsUsers.updateAsync(foundDnsUser);
    })
    .then(function(result) {
      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (/is not deleted properly/.test(error.message)) {
        return reply(boom.badImplementation('DNS Zone is not deleted'));
      } else {
        return reply(boom.badRequest(error.message));
      }
    });
};

exports.getDnsZoneRecords = function(request, reply) {
  var dnsZone = request.params.dns_zone;

  var statusResponse = {
    statusCode: 200,
    message: ''
  };
};
