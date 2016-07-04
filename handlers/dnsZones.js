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

var DNSZone = require('../models/DNSZone');
var User = require('../models/User');
var utils = require('../lib/utilities.js');

var dnsZones = Promise.promisifyAll(new DNSZone(mongoose, mongoConnection.getConnectionPortal()));

var NS1 = require('ns1');
NS1.set_api_key(config.get('nsone.api_key'));

exports.getDnsZones = function(request, reply) {
  var accountIds = utils.getAccountID(request);
  dnsZones.accountListZones(accountIds, function (error, zones) {
    renderJSON(request, reply, error, zones);
  });
};

exports.createDnsZone = function(request, reply) {
  var payload = request.payload;
  var accountId = payload.account_id;
  var zone = payload.dns_zone;
  var statusResponse;

  return Promise.try(function() {
    // Check account access
    if (!utils.checkUserAccessPermissionToAccount(request, accountId)) {
      throw new Error('Account ID not found');
    }

    return dnsZones.getByZoneAsync(zone);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (dnsZone) {
        throw new Error('DNS zone is unavailable');
      }

      return NS1.Zone.find(zone)
        .then(function(nsoneZone) {
          throw new Error('DNS zone is unavailable');
        })
        .catch(function(error) {
          return Promise.resolve(true);
        });
    })
    .then(function() {
      return NS1.Zone.create({zone: zone})
        .then(function(nsoneZone) {
          return nsoneZone;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneZone) {
      payload.zone = zone;
      delete payload.dns_zone;
      return dnsZones.addAsync(payload);
    })
    .then(function(newZone) {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully created new DNS zone',
        object_id: newZone._id
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      // Process NS1 Errors
      if (/NS1 API Request Failed on/.test(error.message)) {
        if (/Input validation failed/.test(error.message)) {
          return reply('Invalid DNS zone provided');
        }
      } else {
        if (/NS1 zone/.test(error.message)) {
          return reply(boom.badImplementation('DNS service unable to process your request now, try again later'));
        } else {
          return reply(boom.badRequest(error.message));
        }
      }
    });
};

exports.deleteDnsZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var foundDnsZone;

  var statusResponse = {
    statusCode: 200,
    message: 'Successfully deleted the DNS zone'
  };

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone does not exists');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToAccount(request, dnsZone.account_id)) {
          throw new Error('Account ID not found');
        } else {
          foundDnsZone = dnsZone;
          return Promise.resolve(true);
        }
      }
    })
    .then(function() {
      return NS1.Zone.find(foundDnsZone.zone)
        .then(function(nsoneZone) {
          nsoneZone.destroy()
            .then(function() {
              return Promise.resolve(true);
            })
            .catch(function(error){
              throw new Error('DNS zone cannot be deleted');
            });
        })
        .catch(function(error) {
          throw new Error('DNS zone does not exists');
        });
    })
    .then(function() {
      return dnsZones.removeAsync(zoneId);
    })
    .then(function(result) {
      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      return reply(boom.badRequest(error.message));
    });
};

exports.getDnsZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var foundDnsZone;

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone does not exists');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToAccount(request, dnsZone.account_id)) {
          throw new Error('Account ID not found');
        } else {
          foundDnsZone = dnsZone;
          return true;
        }
      }
    })
    .then(function() {
      return NS1.Zone.find(foundDnsZone.zone)
        .then(function(nsoneZone) {
          foundDnsZone.records = nsoneZone.records;
          return true;
        })
        .catch(function(error) {
          throw new Error('DNS zone does not exists');
        });
    })
    .then(function(result) {
      renderJSON(request, reply, null, foundDnsZone);
    })
    .catch(function(error) {
      return reply(boom.badRequest(error.message));
    });
};

exports.createDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;

  var statusResponse = {
    statusCode: 200,
    message: 'Successfully created new DNS zone record'
  };

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone does not exists');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToAccount(request, dnsZone.account_id)) {
          throw new Error('Account ID not found');
        } else {
          foundDnsZone = dnsZone;
          return Promise.resolve(true);
        }
      }
    })
    .then(function() {
      if (payload.record_domain.indexOf(foundDnsZone.zone) === -1) {
        throw new Error('Invalid DNS zone provided for the record domain');
      }

      return NS1.Zone.find(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw new Error('DNS zone does not exists');
        });
    })
    .then(function() {
      var recordQuery = foundDnsZone.zone + '/' + payload.record_domain + '/' + payload.record_type;
      return NS1.Record.find(recordQuery)
        .then(function(nsoneRecord) {
          throw new Error('DNS zone record already exists');
        })
        .catch(function(error) {
          // Not found
          return Promise.resolve(true);
        });
    })
    .then(function() {
      var newRecord = {
          'zone': foundDnsZone.zone,
          'domain': payload.record_domain,
          'type': payload.record_type,
          'answers': payload.record_body
      };
      return NS1.Record.create(newRecord)
        .then(function(newNsoneRecord) {
          return newNsoneRecord;
        })
        .catch(function(error) {
          throw new Error('Cannot create new DNS zone record');
        });
    })
    .then(function(createdNsoneRecord) {
      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      return reply(boom.badRequest(error.message));
    });
};

exports.deleteDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;

  var statusResponse = {
    statusCode: 200,
    message: 'Successfully deleted the DNS zone record'
  };

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone does not exists');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToAccount(request, dnsZone.account_id)) {
          throw new Error('Account ID not found');
        } else {
          foundDnsZone = dnsZone;
          return Promise.resolve(true);
        }
      }
    })
    .then(function() {
      if (payload.record_domain.indexOf(foundDnsZone.zone) === -1) {
        throw new Error('Invalid DNS zone provided for the record domain');
      }

      return NS1.Zone.find(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw new Error('DNS zone does not exists');
        });
    })
    .then(function() {
      var recordQuery = foundDnsZone.zone + '/' + payload.record_domain + '/' + payload.record_type;
      return NS1.Record.find(recordQuery)
        .then(function(nsoneRecord) {
          return nsoneRecord;
        })
        .catch(function(error) {
          throw new Error('DNS zone record does not exists');
        });
    })
    .then(function(nsoneRecord) {
      return nsoneRecord.destroy()
        .then(function() {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw new Error('Cannot delete the DNS zone record');
        });
    })
    .then(function() {
      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      return reply(boom.badRequest(error.message));
    });
};

exports.updateDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;
  //
};
