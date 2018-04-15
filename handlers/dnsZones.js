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
var async = require('async');
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

var permissionCheck = require('./../lib/requestPermissionScope');

var dnsZones = Promise.promisifyAll(new DNSZone(mongoose, mongoConnection.getConnectionPortal()));

var Nsone = require('../lib/nsone.js');

var ERROR_UNHANDLED_INTERNAL_SERVER_ERROR = 'Unhandled Internal Server Error';
var ERROR_DOMAIN_NOT_FOUND_ROOT_DNS = 'The specified domain name is not found in the global DNS system';
var ERROR_DNS_SERVICE_UNABLE = 'The DNS service is currently unable to process your request. Please try again later.';
var ACCOUNT_NOT_FOUND = 'Account ID not found';

var DNS_ZONE_NOT_FOUND = 'DNS zone not found';
var DNS_ZONE_EXISTS = 'The DNS zone is already registered in the system';
var DNS_ZONE_NOT_EXISTS = 'DNS zone does not exist in the system';
var DNS_ZONE_INVALID_PROVIDED = 'Invalid DNS zone provided';

var DNS_RECORD_INVALID_PROVIDED = 'Invalid DNS zone record provided';
var DNS_RECORD_FOUND = 'DNS zone record found';
var DNS_RECORD_NOT_FOUND = 'DNS zone record not found';
var DNS_RECORD_EXISTS = 'The same DNS zone record already exist in the system';
var DNS_RECORD_NOT_EXISTS = 'DNS zone record does not exist in the system';
var DNS_RECORD_ZONE_INVALID_PROVIDED = 'Invalid DNS zone provided for the record domain';

var CHECK_STATUS_CODES = {
  OK: 'OK',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS'
};

var dnsZoneAutoDisciverDictionary = require('./../lib/dns-zone-auto-discover-dictionary');
var listHostNames = dnsZoneAutoDisciverDictionary.list_of_typical_host_names;
var DNS_RECORD_TYPES_AUTO_DISCOVER = dnsZoneAutoDisciverDictionary.list_of_record_types_auto_discover;

//'DNS service unable to process your request now, try again later'
exports.getDnsZones = function(request, reply) {
  var filters_ = request.query.filters;
  var operation = filters_ ? filters_.operation : null;
  return Promise.try(function() {
      return dnsZones.listAsync({
        filters: filters_
      });
    })
    .then(function(zones) {
      var responseZones = [];
      var callRecordsPromises = [];
      zones.forEach(function(zone) {
        var permissionFilter = 'dns_zones';
        if (operation && operation !== '') {
          permissionFilter = operation;
        }
        if (permissionCheck.checkPermissionsToResource(request, zone, permissionFilter)) {
          responseZones.push(zone);
          // NOTE: call additional inforamtion about DNS Zone
          callRecordsPromises.push(
            Promise.try(function() {
              return Nsone.getDnsZone(zone.zone)
                .then(function(nsoneZone) {
                  // Zone found at NS1, add additional information
                  zone.records_count = nsoneZone.records.length;
                  zone.dns_servers = nsoneZone.dns_servers;
                  return nsoneZone;
                })
                .catch(function(error) {
                  return Promise.resolve({});
                });
            })
          );
        }
      });
      // NOTE: Back the response after get additional information
      return Promise.all(callRecordsPromises)
        .then(function(data) {
          return responseZones;
        });
    })
    .then(function(responseZones) {
      renderJSON(request, reply, null, responseZones);
    })
    .catch(function(error) {
      if (error.message) {
        return reply(boom.badRequest(error.message));
      } else {
        return reply(boom.badImplementation('getDnsZones:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.getDnsZonesStatsUsage = function(request, reply) {
  return Promise.try(function() {
      return dnsZones.listAsync();
    })
    .then(function(zones) {
      var responseZones = [];
      zones.forEach(function(zone) {
        if (permissionCheck.checkPermissionsToResource(request, zone, 'dns_zones')) {
          responseZones.push(zone);
        }
      });
      return responseZones;
    })
    .then(function(responseZones) {
      return Nsone.getDnsZonesUsage()
        .then(function(zonesUsage) {
          // Add usage stats to response zones
          zonesUsage.forEach(function(usageStats) {
            responseZones.forEach(function(dnsZone) {
              if (usageStats.zone === dnsZone.zone) {
                dnsZone.records_count = usageStats.records;
                dnsZone.queries_count = usageStats.queries;
              }
            });
          });
          return responseZones;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(responseZones) {
      renderJSON(request, reply, null, responseZones);
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
        return reply(boom.badImplementation('getDnsZonesStatsUsage:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.createDnsZone = function(request, reply) {
  var payload = request.payload;
  var newDnsZone = request.payload;
  var createdBy = utils.generateCreatedByField(request);
  var accountId = payload.account_id;
  var zone = payload.zone;
  var nsoneZoneInfo;
  var statusResponse;

  return Promise.try(function() {
      // Check account access
      if (!permissionCheck.checkPermissionsToResource(request, {id: accountId}, 'accounts')) {
        throw new Error(ACCOUNT_NOT_FOUND);
      }
      // Get DNS zone by dns_zone domain
      return dnsZones.getByZoneAsync(zone);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (dnsZone) {
        throw new Error(DNS_ZONE_EXISTS);
      }

      // Get DNS zone from NS1 API
      return Nsone.getDnsZone(zone)
        .then(function(nsoneZone) {
          // Zone found on NS1, but not exists in our DNSZone collection, something wrong
          logger.error('DNS zone ' + zone + ' found on NS1, but does not exist in DNSZone collection ');
          throw new Error(DNS_ZONE_EXISTS);
        })
        .catch(function(error) {
          if (error.message === 'Not Found') {
            // If zone not found at NS1 we can create it
            return Promise.resolve(true);
          } else {
            // otherwise we throw error
            throw error;
          }
        });
    })
    .then(function() {
      // Creating DNS zone for NS1
      return Nsone.createDnsZone(zone)
        .then(function(nsoneZone_) {
          // zone successfully created
          nsoneZoneInfo = nsoneZone_;
          return nsoneZone_;
        })
        .catch(function(error) {
          logger.error('NS1 error ', error);
          throw error;
        });
    })
    .then(function(nsoneZone) {
      // prepare newDnsZone(paylod data) for mongoose DNSZone model
      newDnsZone.created_by = createdBy;
      newDnsZone.updated_by = createdBy;
      // create DNSZone doc
      return dnsZones.addAsync(newDnsZone);
    })
    .then(function(newDnsZone_) {
      // NOTE: prepare information for audit logger and store it
      newDnsZone_.ttl = nsoneZoneInfo.ttl;
      newDnsZone_.refresh = nsoneZoneInfo.refresh;
      newDnsZone_.retry = nsoneZoneInfo.retry;
      newDnsZone_.expiry = nsoneZoneInfo.expiry;
      newDnsZone_.nx_ttl = nsoneZoneInfo.nx_ttl;

      AuditLogger.store({
        account_id: accountId,
        activity_type: 'add',
        activity_target: 'dnszone',
        target_id: newDnsZone_._id,
        target_name: newDnsZone_.zone,
        target_object: newDnsZone_,
        operation_status: 'success'
      }, request);
      return Promise.resolve(newDnsZone_);
    })
    .then(function(newZone) {
      // zone successfully added in db
      statusResponse = {
        statusCode: 200,
        message: 'Successfully created new DNS zone',
        object_id: newZone._id
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_ZONE_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else {
            if (/NS1 zone/.test(error.message)) {
              return reply(boom.badImplementation(ERROR_DNS_SERVICE_UNABLE));
            } else {
              if (!!error.response && error.response.body && error.response.body.message) {
                // NOTE: Show message from NS1
                return reply(boom.badRequest(error.response.body.message));
              }
              return reply(boom.badRequest(error.message));
            }
          }
        }
      } else {
        return reply(boom.badImplementation('createDnsZone:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.deleteDnsZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var foundDnsZone;
  var nsoneZoneInfo;
  var statusResponse;

  return Promise.try(function() {
      // get DNS zone by id
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        // DNS zone exists, so we can delete it
        foundDnsZone = dnsZone;
        return Promise.resolve(true);
      }
    })
    .then(function() {
      // Get zone from NS1 API
      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone_) {
          nsoneZoneInfo = nsoneZone_;
          // Found zone, delete then
          return Nsone.deleteDnsZone(nsoneZone_)
            .then(function() {
              // Zone removed from NS1
              return Promise.resolve(true);
            })
            .catch(function(error) {
              throw error;
            });
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      // Delete zone from DNSZone collection
      return dnsZones.removeAsync(zoneId);
    })
    .then(function(removedDnsZone_) {
      // NOTE: prepare information for audit logger and store it
      foundDnsZone.ttl = nsoneZoneInfo.ttl;
      foundDnsZone.refresh = nsoneZoneInfo.refresh;
      foundDnsZone.retry = nsoneZoneInfo.retry;
      foundDnsZone.expiry = nsoneZoneInfo.expiry;
      foundDnsZone.nx_ttl = nsoneZoneInfo.nx_ttl;

      AuditLogger.store({
        activity_type: 'delete',
        activity_target: 'dnszone',
        target_id: foundDnsZone.id,
        target_name: foundDnsZone.zone,
        target_object: foundDnsZone, // NOTE: save info about already deleted object
        operation_status: 'success'
      }, request);
      return Promise.resolve(removedDnsZone_);
    })
    .then(function(result) {
      // DNS zone successfully removed from NS1 and DNSZone collection
      statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the DNS zone'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            return reply(boom.badRequest(DNS_ZONE_INVALID_PROVIDED));
          } else if (/DNS zone not found/.test(error.message)) {
            return reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else {
            return reply(boom.badImplementation(error.message));
          }
          if (!!error.response && error.response.body && error.response.body.message) {
            // NOTE: Show message from NS1
            return reply(boom.badRequest(error.response.body.message));
          }
          return reply(boom.badRequest(error.message));
        }
      } else {
        return reply(boom.badImplementation('deleteDnsZone:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.updateDnsZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var zoneBody = request.payload;
  var updatedBy = utils.generateCreatedByField(request);
  var foundDnsZone;
  var statusResponse;
  var nsoneZoneInfo;

  return Promise.try(function() {
      // Get DNS zone by id
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        // Found zone to update
        foundDnsZone = dnsZone;
        return Promise.resolve(true);
      }
    })
    .then(function() {
      // Get zone from NS1 API
      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          // Zone found at NS1, update it
          return nsoneZone;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(updatingNsonsZone) {
      // Update the zone with zoneBody
      return Nsone.updateDnsZone(updatingNsonsZone, zoneBody)
        .then(function(updatedNsoneZone) {
          // successfully updated the zone
          nsoneZoneInfo = updatedNsoneZone;
          // update local data
          zoneBody._id = zoneId;
          zoneBody.updated_at = new Date();
          zoneBody.updated_by = updatedBy;
          return dnsZones.updateAsync(zoneBody);
        })
        .then(function(updatedDnsZone_) {
          // NOTE: prepare information for audit logger and store it
          updatedDnsZone_.ttl = nsoneZoneInfo.ttl;
          updatedDnsZone_.refresh = nsoneZoneInfo.refresh;
          updatedDnsZone_.retry = nsoneZoneInfo.retry;
          updatedDnsZone_.expiry = nsoneZoneInfo.expiry;
          updatedDnsZone_.nx_ttl = nsoneZoneInfo.nx_ttl;

          AuditLogger.store({
            account_id: updatedDnsZone_.account_id,
            activity_type: 'modify',
            activity_target: 'dnszone',
            target_id: updatedDnsZone_._id,
            target_name: updatedDnsZone_.zone,
            target_object: updatedDnsZone_, // NOTE: save extented information about changes
            operation_status: 'success'
          }, request);
          return Promise.resolve(updatedDnsZone_);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(result) {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the DNS zone'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_ZONE_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/DNS zone not found/.test(error.message)) {
            return reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              // NOTE: Show message from NS1
              return reply(boom.badRequest(error.response.body.message));
            }
            return reply(boom.badRequest(error.message));
          }
        }
      } else {
        return reply(boom.badImplementation('updateDnsZone:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
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
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return true;
      }
    })
    .then(function() {
      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return nsoneZone;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneZone) {
      var responseZone = {
        id: foundDnsZone.id,
        zone: foundDnsZone.zone,
        account_id: foundDnsZone.account_id,
        ttl: nsoneZone.ttl,
        nx_ttl: nsoneZone.nx_ttl,
        retry: nsoneZone.retry,
        expiry: nsoneZone.expiry,
        refresh: nsoneZone.refresh,
        records: nsoneZone.records,
        dns_servers: nsoneZone.dns_servers
      };
      renderJSON(request, reply, null, responseZone);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_ZONE_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              // NOTE: Show message from NS1
              return reply(boom.badRequest(error.response.body.message));
            }
            return reply(boom.badRequest(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:getDnsZone');
        return reply(boom.badImplementation(ERROR_UNHANDLED_INTERNAL_SERVER_ERROR));
      }
    });
};
/**
 * @name getDnsZoneAutoDiscover
 * @description get data about which DNS Zone Records is already exists
 *
 */
exports.getDnsZoneAutoDiscover = function(request, reply) {
  var zoneName = request.params.zone_name;
  var response = {
    zone_records: []
  };
  var recordTypes = DNS_RECORD_TYPES_AUTO_DISCOVER; // NOTE: Type DNS Rrecords for check
  var dnsRecordChecks = [];

  var workFlowData_ = {
    zone: zoneName,
    dnsRecordChecks: [],
    response: {}
  };
  // NOTE: run main work-flow process
  async.waterfall([
    //NOTE: get an IP DNS server
    function(cb) {
      var zonename_ = zoneName;
      dnsResolve.resolve(zonename_, 'NS', function(err, data) {
        if (err) {
          // Error get IP
          cb(err);
          return;
        }
        if (!data.short_answers || data.short_answers.length === 0) {
          cb(new Error('Zone with name "' + zonename_ + '" no have record with "NS"'));
          return;
        }
        workFlowData_.dns_server_host = data.short_answers[0];
        var hostname_ = data.short_answers[0];
        dnsResolve.resolve(hostname_, 'A', function(err, data) {
          if (err) {
            cb(err);
            return;
          }
          workFlowData_.dns_server_ip = workFlowData_.dns_server_ip = data.short_answers[0];
          cb(null);
        });
      });
    },
    // NOTE: prepare request for main domain name
    function(cb) {
      var zoneName_ = zoneName;
      var dnsServerIp = workFlowData_.dns_server_ip;
      // NOTE: for main domain don't ask NS record
      var recordTypesMainDomain = _.filter(recordTypes, function(item) {
        return item !== 'NS';
      });
      async.each(recordTypesMainDomain,function(itemType, cbTypes) {
        workFlowData_.dnsRecordChecks.push(function(cb_) {
          var question_ = {
            name: zoneName_,
            type: itemType
          };
          dnsResolve.getDNSData(question_, dnsServerIp)
            .then(function(data) {
              var returnItem = null;
              if (!!data && !!data.answer && data.answer.length > 0) {
                returnItem = {
                  type: itemType,
                  zone: zoneName_,
                  domain: zoneName_,
                  answers:  _.map(data.answer, function(item) {
                    return {
                      // NOTE: convert data to format NSONE
                      answer: dnsResolve.formatToNSONEAnswerFromFullInfo(itemType, item)
                    };
                  })
                };
                // NOTE: get TTL from first answer by default because NSONE use only one TTL value for all answers
                returnItem.ttl = data.answer[0].ttl || dnsResolve.DNS_CONST.TTL;
              }
              cb_(null, returnItem);
            })
            .catch(function(err) {
              cb_(null, null);
            });
        });
        cbTypes(null);
      }, function(err){
        cb(null);
      });
    },
    // NOTE: prepare requests for subdomains
    function(cb) {
      var zoneName_ = zoneName;
      var dnsServerIp = workFlowData_.dns_server_ip;
      async.each(listHostNames, function(itemZone,callback) {
        var checkZoneName_ = [itemZone, zoneName_].join('.');
        async.each(recordTypes,function(itemType,cbTypes) {
          workFlowData_.dnsRecordChecks.push(function(cb_) {
            var question_ = {
              name: checkZoneName_,
              type: itemType
            };
            dnsResolve.getDNSData(question_, dnsServerIp)
              .then(function(data) {
                var returnItem = null;
                if (!!data && !!data.answer && data.answer.length > 0) {
                  returnItem = {
                    type: itemType,
                    zone: checkZoneName_,
                    domain: checkZoneName_,
                    answers: _.map(data.answer, function(item) {
                      return {
                        answer: dnsResolve.formatToNSONEAnswerFromFullInfo(itemType, item)
                      };
                    })
                  };
                  // NOTE: get TTL from first answer by default because NSONE use only one TTL value for all answers
                  returnItem.ttl = data.answer[0].ttl || dnsResolve.DNS_CONST.TTL;
                }
                cb_(null, returnItem);
              })
              .catch(function(err) {
                cb_(null, null);
              });
          });
          cbTypes(null);
        }, function(err){
          callback();
        });
      },function(err){
        cb(err);
      });
    },
    // NOTE: make all requests parrallel by 2 for get all information
    function(cb) {
      async.parallelLimit(workFlowData_.dnsRecordChecks, 2,function(err, result) {
        if (err) {
          cb(new Error('DNS check error'));
          return;
        }
        workFlowData_.result = result;
        cb(null);
      });
    },
    // NOTE: prepare and send response information
    function(cb) {
      workFlowData_.response.zone_records = _.filter(workFlowData_.result, function(item) {
        return !!item;
      });
      workFlowData_.response.count = workFlowData_.response.zone_records.length;
      cb(null);
    }
  ],
  // NOTE: end of all works - send to user a response or an error
  function(err) {
    if (err) {
      if (err.error === ERROR_DOMAIN_NOT_FOUND_ROOT_DNS) {
        reply(boom.badRequest(ERROR_DOMAIN_NOT_FOUND_ROOT_DNS));
        return;
      } else {
        reply(boom.badImplementation('DNS check error'));
        return;
      }
    }
    reply(workFlowData_.response);
  });
};

exports.getDnsZoneRecords = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var foundDnsZone;
  var responseZoneRecords = [];
  return Promise.try(function() {
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return true;
      }
    })
    .then(function() {
      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return nsoneZone;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneZone) {
      nsoneZone.records.forEach(function(record) {
        var sendRecord = {
          id: record.id,
          dns_zone_id: zoneId,
          type: record.type,
          short_answers: record.short_answers,
          domain: record.domain,
          tier: record.tier,
          link: record.link
        };
        // NOTE: prepare record info for list
        responseZoneRecords.push(sendRecord);
      });
      renderJSON(request, reply, null, responseZoneRecords);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_ZONE_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              // NOTE: Show message from NS1
              return reply(boom.badRequest(error.response.body.message));
            }
            return reply(boom.badRequest(error.message));
          }
        }
      } else {
        return reply(boom.badImplementation('getDnsZone::' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.createDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var recordDomain = payload.domain;
  var recordType = payload.type;
  var recordBody = payload.record;
  var foundDnsZone;
  var nsoneZoneRecordInfo;
  var statusResponse;
  var updatedBy = utils.generateCreatedByField(request);

  return Promise.try(function() {
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return Promise.resolve(true);
      }
    })
    .then(function() {
      if (recordDomain.indexOf(foundDnsZone.zone) === -1) {
        throw new Error(DNS_RECORD_ZONE_INVALID_PROVIDED);
      }

      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, recordDomain, recordType)
        .then(function(nsoneRecord) {
          throw new Error(DNS_RECORD_FOUND);
        })
        .catch(function(error) {
          // Not found
          return Promise.resolve(true);
        });
    })
    .then(function() {
      return Nsone.createDnsZoneRecord(
          foundDnsZone.zone,
          recordDomain,
          recordType,
          recordBody
        )
        .then(function(newNsoneRecord_) {
          nsoneZoneRecordInfo = newNsoneRecord_;
          return newNsoneRecord_;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(newDnsRecord_) {
      // NOTE: prepare information for audit logger and store it
      // delete not needed data
      delete nsoneZoneRecordInfo.networks;
      delete nsoneZoneRecordInfo.meta;
      delete nsoneZoneRecordInfo.regions;
      delete nsoneZoneRecordInfo.filters;

      AuditLogger.store({
        activity_type: 'add',
        activity_target: 'dnsrecord',
        target_id: nsoneZoneRecordInfo.id, //NOTE: id - is NS1 record identifier
        target_name: nsoneZoneRecordInfo.domain,
        target_object: nsoneZoneRecordInfo,
        operation_status: 'success'
      }, request);
      return Promise.resolve(true);
    })
    // NOTE: update DNS Zone after create DNS Zone record
    .then(function(){
      var updateInformation = {
        _id: foundDnsZone.id,
        updated_at: new Date(),
        updated_by: updatedBy
      };
      return dnsZones.updateAsync(updateInformation);
    })
    .then(function() {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully created new DNS zone record'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_RECORD_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_ZONE_INVALID_PROVIDED));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else if (/DNS zone record found/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_EXISTS));
          } else if (/record already exists/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              var message_ = error.response.body.message;
              // NOTE: Show message from NS1
              if (/record already exists/.test(message_)) {
                message_ = DNS_RECORD_EXISTS;
              }
              return reply(boom.badRequest(message_));
            } else {
              return reply(boom.badRequest(error.message));
            }
          }
        }
      } else {
        return reply(boom.badImplementation('createDnsZoneRecord:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.deleteDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var recordId = request.params.dns_zone_record_id;
  var payload = request.payload;
  var recordDomain;
  var recordType;
  var foundDnsZone;
  var nsoneZoneRecordInfo;
  var statusResponse;
  var updatedBy = utils.generateCreatedByField(request);

  return Promise.try(function() {
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return Promise.resolve(true);
      }
    })
    .then(function() {
      // if (recordDomain.indexOf(foundDnsZone.zone) === -1) {
      //   throw new Error(DNS_RECORD_ZONE_INVALID_PROVIDED);
      // }

      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.try(function() {
            var findRecord = _.find(nsoneZone.records, { 'id': recordId });
            if (findRecord) {
              recordType = findRecord.type;
              recordDomain = findRecord.domain;
              return Promise.resolve(true);
            } else {
              throw new Error(DNS_RECORD_NOT_FOUND);
            }
          });
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, recordDomain, recordType)
        .then(function(nsoneRecord_) {
          nsoneZoneRecordInfo = nsoneRecord_;
          return nsoneRecord_;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneRecord) {
      return Nsone.deleteDnsZoneRecord(nsoneRecord)
        .then(function() {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      // NOTE: prepare information for audit logger and store it
      // delete not needed data
      delete nsoneZoneRecordInfo.networks;
      delete nsoneZoneRecordInfo.meta;
      delete nsoneZoneRecordInfo.regions;
      delete nsoneZoneRecordInfo.filters;

      AuditLogger.store({
        activity_type: 'delete',
        activity_target: 'dnsrecord',
        target_id: nsoneZoneRecordInfo.id, //NOTE: id - is NS1 record identifier
        target_name: nsoneZoneRecordInfo.domain,
        target_object: nsoneZoneRecordInfo, // NOTE: save info about deleted object
        operation_status: 'success'
      }, request);
      return Promise.resolve(true);
    })
    // NOTE: update DNS Zone after delete DNS Zone record
    .then(function() {
      var updateInformation = {
        _id: foundDnsZone.id,
        updated_at: new Date(),
        updated_by: updatedBy
      };
      return dnsZones.updateAsync(updateInformation);
    })
    .then(function() {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully deleted the DNS zone record'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_RECORD_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_ZONE_INVALID_PROVIDED));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else if (/DNS zone record not found/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_NOT_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              // NOTE: Show message from NS1
              return reply(boom.badRequest(error.response.body.message));
            }
            return reply(boom.badRequest(error.message));
          }
        }
      } else {
        return reply(boom.badImplementation('deleteDnsZoneRecord:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.updateDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var recordDomain = payload.domain;
  var recordZone = payload.zone;
  var recordType = payload.type;
  var foundDnsZone;
  var nsoneZoneRecordInfo;
  var statusResponse;
  var updatedBy = utils.generateCreatedByField(request);

  return Promise.try(function() {
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return Promise.resolve(true);
      }
    })
    .then(function() {
      if (recordDomain.indexOf(foundDnsZone.zone) === -1) {
        throw new Error(DNS_RECORD_ZONE_INVALID_PROVIDED);
      }

      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, recordDomain, recordType)
        .then(function(nsoneRecord) {
          return nsoneRecord;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneRecord) {
      var sendRecordData = {
        answers: payload.answers,
        ttl: payload.ttl,
        tier: payload.tier,
        use_client_subnet: payload.use_client_subnet,
        link: payload.link
      };
      return Nsone.updateDnsZoneRecord(nsoneRecord, sendRecordData)
        .then(function(updatedNsoneRecord_) {
          nsoneZoneRecordInfo = updatedNsoneRecord_;
          return updatedNsoneRecord_;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(updatedNsoneRecord_) {
      // NOTE: prepare information for audit logger and store it
      // delete not needed data
      delete nsoneZoneRecordInfo.networks;
      delete nsoneZoneRecordInfo.meta;
      delete nsoneZoneRecordInfo.regions;
      delete nsoneZoneRecordInfo.filters;
      AuditLogger.store({
        activity_type: 'modify',
        activity_target: 'dnsrecord',
        target_id: nsoneZoneRecordInfo.id,
        target_name: nsoneZoneRecordInfo.domain,
        target_object: nsoneZoneRecordInfo, // NOTE: save extented information about changes
        operation_status: 'success'
      }, request);
      return Promise.resolve(true);
    })
    // NOTE: update DNS Zone after update DNS Zone record
    .then(function() {
      var updateInformation = {
        _id: foundDnsZone.id,
        updated_at: new Date(),
        updated_by: updatedBy
      };
      return dnsZones.updateAsync(updateInformation);
    })
    .then(function() {
      statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the DNS zone record'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_RECORD_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_ZONE_INVALID_PROVIDED));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else if (/DNS zone record not found/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_NOT_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              // NOTE: Show message from NS1
              return reply(boom.badRequest(error.response.body.message));
            }
            return reply(boom.badRequest(error.message));
          }
        }
      } else {
        return reply(boom.badImplementation('updateDnsZoneRecord:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};


exports.getDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var recordId = request.params.dns_zone_record_id;
  var recordDomain;
  var recordType;
  var foundDnsZone;
  var statusResponse;

  return Promise.try(function() {
      return dnsZones.getAsync(zoneId);
    })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone || !permissionCheck.checkPermissionsToResource(request, dnsZone, 'dns_zones')) {
        throw new Error(DNS_ZONE_NOT_FOUND);
      } else {
        foundDnsZone = dnsZone;
        return Promise.resolve(true);
      }
    })
    .then(function() {
      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.try(function() {
            var findRecord = _.find(nsoneZone.records, { 'id': recordId });
            if (findRecord) {
              recordType = findRecord.type;
              recordDomain = findRecord.domain;
              return Promise.resolve(true);
            } else {
              throw new Error(DNS_RECORD_NOT_FOUND);
            }
          });
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, recordDomain, recordType)
        .then(function(nsoneRecord) {
          return Promise.resolve(nsoneRecord);
        })
        .catch(function(error) {
          // Not found
          throw new Error(DNS_RECORD_NOT_FOUND);
        });
    })
    .then(function(existsNsoneRecord) {
      // NOTE: clear response data
      delete existsNsoneRecord.networks;
      delete existsNsoneRecord.filters;
      delete existsNsoneRecord.feeds;
      delete existsNsoneRecord.meta;
      delete existsNsoneRecord.regions;
      renderJSON(request, reply, null, existsNsoneRecord);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest(ERROR_DNS_SERVICE_UNABLE));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply(boom.badRequest(DNS_RECORD_INVALID_PROVIDED));
            } else {
              return reply(boom.badRequest(error.message));
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_ZONE_INVALID_PROVIDED));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest(DNS_ZONE_NOT_EXISTS));
          } else if (/DNS zone record not found/.test(error.message)) {
            reply(boom.badRequest(DNS_RECORD_NOT_EXISTS));
          } else {
            if (!!error.response && error.response.body && error.response.body.message) {
              // NOTE: Show message from NS1
              return reply(boom.badRequest(error.response.body.message));
            }
            return reply(boom.badRequest(error.message));
          }
        }
      } else {
        return reply(boom.badImplementation('getDnsZoneRecord:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
      }
    });
};

exports.checkDnsZoneNS = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var zone;
  var workFlowData_ = {};

  return Promise.try(function getDNSZoneInfo() {
      return dnsZones.getAsync(zoneId)
        .then(function(data) {
          workFlowData_.zone = data;
          return Promise.resolve(data);
        });
    })
    // Check User Access Permission To DNS Zone
    .then(function() {
      return Promise.try(function() {
        var zone_ = workFlowData_.zone;
        if (!permissionCheck.checkPermissionsToResource(request, zone_, 'dns_zones')) {
          throw new Error(DNS_ZONE_NOT_FOUND);
        } else {
          return Promise.resolve();
        }
      });
    })
    //===============================
    // Получить данные о зоне с NSONE
    //==============================
    .then(function() {
      var zone_ = workFlowData_.zone.zone;
      return Nsone.getDnsZone(zone_)
        .then(function(nsoneZone) {
          workFlowData_.nsone_zone = nsoneZone;
          return nsoneZone;
        })
        .catch(function(error) {
          // Can get data from NSONE
          // need to broke the process
          throw new Error(DNS_ZONE_NOT_EXISTS);
        });
    })
    //===============================
    // Получить
    //  - имя ROOT Domain Zone,
    //  - доступные DNS servers  и
    //  - IP одного из root DNS server
    //==============================
    .then(function() {
      var zoneName_ = workFlowData_.zone.zone;
      var domainNames = zoneName_.split('.');
      workFlowData_.root_zone = domainNames[domainNames.length - 1];
      return new Promise(function(resolve, reject) {
        var rootDomainZone_ = workFlowData_.root_zone;
        dnsResolve.resolve(rootDomainZone_, 'NS', function(err, data) {
          if (err) {
            throw new Error(err);
          }
          workFlowData_.root_zone_ns = data.short_answers;
          var hostname_ = workFlowData_.root_zone_ns[0];
          dnsResolve.resolve(hostname_, 'A', function(err, data) {
            if (err) {
              // Error get IP for root DNS server
              throw new Error(err);
            }
            workFlowData_.root_zone_ip = data.short_answers[0];
            resolve();
          });
        });
      });
    })
    //===============================
    // Получить данные о Authority DNS серверах для zone c root DNS
    //===============================
    .then(function() {
      var question_ = {
        name: workFlowData_.zone.zone,
        type: 'NS'
      };
      var server_addres_ = workFlowData_.root_zone_ip;
      return dnsResolve.getDNSData(question_, server_addres_)
        .then(function(answer) {
          workFlowData_.root_dns_servers = _.map(answer.authority, function(item) {
            return item.data;
          });
          return answer;
        });
    })
    //===============================
    // выполнить проверки и подготовить check_report
    //===============================
    .then(function() {
      workFlowData_.check_reports = [];
      workFlowData_.nsone_zone.dns_servers.forEach(function(item) {
        var checkReport_ = {
          type_check: 'dns_servers',
          hostname: item
        };

        if (workFlowData_.root_dns_servers.indexOf(item) !== -1) {
          checkReport_.check_status_code = CHECK_STATUS_CODES.OK;
          checkReport_.message = 'NS record "' + item + '" is properly configured';
        } else {
          checkReport_.check_status_code = CHECK_STATUS_CODES.ERROR;
          checkReport_.message = 'NS record "' + item + '" is not pointing to an expected DNS server';
        }
        workFlowData_.check_reports.push(checkReport_);
      });
    })
    //===============================
    // Формирование итоговой информации о выполненой проверке
    //===============================
    .then(function() {
      var totalErrorStatus_ = 0;
      _.forEach(workFlowData_.check_reports, function(item) {
        if (item.check_status_code === CHECK_STATUS_CODES.ERROR) {
          totalErrorStatus_++;
        }
      });
      if (totalErrorStatus_ > 0) {
        if (totalErrorStatus_ === workFlowData_.check_reports.length) {
          workFlowData_.check_status_code = CHECK_STATUS_CODES.ERROR;
          workFlowData_.message = 'All NS records have failed to pass the test';
        }
        if (totalErrorStatus_ !== workFlowData_.check_reports.length) {
          workFlowData_.check_status_code = CHECK_STATUS_CODES.WARNING;
          workFlowData_.message = 'Some NS records have failed to pass the test';
        }
      } else {
        workFlowData_.check_status_code = CHECK_STATUS_CODES.OK;
        workFlowData_.message = 'All NS records are configured correctly';
      }
    })
    .then(function(data) {
      delete workFlowData_.zone;
      delete workFlowData_.root_dns_servers;
      delete workFlowData_.root_zone_ns;
      delete workFlowData_.root_zone_ip;
      delete workFlowData_.nsone_zone;
      renderJSON(request, reply, null, workFlowData_);
    })
    .catch(function(error) {
      return reply(boom.badImplementation('CheckDnsZoneNS:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));

    });
};

exports.checkDnsZoneRecords = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var recordId = request.params.dns_zone_record_id;
  var workFlowData_ = {};
  return Promise.try(function getDNSZoneInfo() {
      return dnsZones.getAsync(zoneId)
        .then(function(data) {
          workFlowData_.zone = data;
          return Promise.resolve(data);
        });
    })
    // Check User Access Permission To DNS Zone
    .then(function() {
      return Promise.try(function() {
        var zone_ = workFlowData_.zone;
        if (!permissionCheck.checkPermissionsToResource(request, zone_, 'dns_zones')) {
          throw new Error(DNS_ZONE_NOT_FOUND);
        } else {
          return Promise.resolve();
        }
      });
    })
    //===============================
    // Получить данные о зоне с NSONE
    //==============================
    .then(function() {
      var zone_ = workFlowData_.zone.zone;
      return Nsone.getDnsZone(zone_)
        .then(function(nsoneZone) {
          workFlowData_.nsone_zone = nsoneZone;
          // filter records with type for fast DNS resolve
          workFlowData_.nsone_zone.records = _.filter(nsoneZone.records, function(item) {
            // NOTE: @see https://nodejs.org/api/dns.html#dns_dns_resolve_hostname_rrtype_callback
            var rrecordTypeList = ['A', 'AAAA', 'NS', 'CNAME', 'PTR', 'NAPTR', 'TXT', 'MX', 'SRV', 'SOA'];
            return (rrecordTypeList.indexOf(item.type) !== -1);
          });
          return Promise.resolve(nsoneZone);
        })
        .catch(function(error) {
          // Can get data from NSONE need broke the process
          throw new Error(DNS_ZONE_NOT_EXISTS);
        });
    })
    //===============================
    // Получить
    //  - IP одного из DNS servers NSONE
    //==============================
    .then(function() {
      return new Promise(function(resolve, reject) {
        var hostname_ = workFlowData_.nsone_zone.dns_servers[0];
        dnsResolve.resolve(hostname_, 'A', function(err, data) {
          if (err) {
            // Error get IP
            throw new Error(err);
          }
          workFlowData_.dns_server_ip = data.short_answers[0];
          resolve();
        });
      });
    })
    //=================================
    // Выполнить проверку для каждой записи и
    //=================================
    .then(function() {
      var checkRecordList_ = workFlowData_.nsone_zone.records;
      var promisiesList_ = [];
      checkRecordList_.forEach(function(record) {
        promisiesList_.push(
          new Promise(function(resolve, reject) {
            var record_ = record;
            var question_ = {
              name: record_.domain,
              type: record_.type
            };
            var server_addres_ = workFlowData_.dns_server_ip;
            dnsResolve.getDNSData(question_, server_addres_)
              .then(function(data) {
                // NOTE: make short_answers for compare result NSONE configuration and resolved information
                data.short_answers = _.map(data.answer, function(item) {
                  // for different Record Type - different  short_answers
                  // TODO: Need compare data for different structure
                  // Examples:
                  // - Part answer from NSONE
                  // "records": [
                  //   {
                  //     "domain": "vipbilet.xyz",
                  //     "short_answers": [
                  //       "30 mail.vipbilet.xyz"
                  //     ],
                  //     "link": null,
                  //     "ttl": 380,
                  //     "tier": 1,
                  //     "type": "MX",
                  //     "id": "57a0c8cd9f939b000123627c"
                  //   }
                  // ],
                  //- Part answer from native-dns Resolve
                  //  "answer": [
                  //   {
                  //     "name": "vipbilet.xyz",
                  //     "type": 15,
                  //     "class": 1,
                  //     "ttl": 380,
                  //     "priority": 30,
                  //     "exchange": "mail.vipbilet.xyz"
                  //   }
                  // ],
                  return item.data || item.address;
                });
                var checkReport_ = {
                  type_check: 'dns_servers',
                  check_status_code: CHECK_STATUS_CODES.ERROR,
                  message: 'Server failed check'
                };
                // TODO: need compare configuration and change checkReport_
                // if (workFlowData_.nsone_zone.indexOf(item) !== -1) {
                //   checkReport_.check_status_code = CHECK_STATUS_CODES.OK;
                //   checkReport_.message = 'Check DNS record "' + item + '" is passed';
                // } else {
                //   checkReport_.check_status_code = CHECK_STATUS_CODES.ERROR;
                //   checkReport_.message = 'Failed check DNS record "' + item + '" ';
                // }
                resolve(checkReport_);
              }, function(data) {
                var checkReport_ = {
                  type_check: 'dns_servers',
                  check_status_code: CHECK_STATUS_CODES.ERROR,
                  message: 'Server failed check'
                };
                resolve(checkReport_);
              });
          })
        );
      });
      return Promise.all(promisiesList_).then(function(data) {
        workFlowData_.check_reports = data;
        return Promise.resolve(data);
      });
    })
    // TODO: fix create total check results
    .then(function() {
      workFlowData_.check_status_code = CHECK_STATUS_CODES.ERROR;
      workFlowData_.message = 'Server method not compled';
    })
    .then(function() {
      // TODO: delete not needed property form workFlowData_
      renderJSON(request, reply, null, workFlowData_);
    })
    .catch(function(error) {
      return reply(boom.badImplementation('checkDnsZoneRecords:: ' + ERROR_UNHANDLED_INTERNAL_SERVER_ERROR, error));
    });
};
