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

var Nsone = require('../lib/nsone.js');

exports.getDnsZones = function(request, reply) {
  dnsZones.list(function (error, zones) {
    var responseZones = [];
    zones.forEach(function(zone) {
      if (utils.checkUserAccessPermissionToDNSZone(request, zone)) {
        responseZones.push(zone);
      }
    });
    renderJSON(request, reply, error, responseZones);
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
    // Get DNS zone by dns_zone domain
    return dnsZones.getByZoneAsync(zone);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (dnsZone) {
        throw new Error('DNS zone is already registered in the system');
      }

      // Get DNS zone from NS1 API
      return Nsone.getDnsZone(zone)
        .then(function(nsoneZone) {
          // Zone found on NS1, but not exists in our DNSZone collection, something wrong
          logger.error('DNS zone found on NS1, but does not exist in DNSZone collection: ', zone);
          throw new Error('DNS zone is already registered in the system');
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
        .then(function(nsoneZone) {
          // zone successfully created
          return nsoneZone;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneZone) {
      // prepare paylod for mongoose DNSZone model
      payload.zone = zone;
      delete payload.dns_zone;

      // create DNSZone doc
      return dnsZones.addAsync(payload);
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
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
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
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:createDnsZone');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
      }
    });
};

exports.deleteDnsZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var foundDnsZone;
  var statusResponse;

  return Promise.try(function() {
    // get DNS zone by id
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone not found');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToDNSZone(request, dnsZone)) {
          throw new Error('DNS zone not found');
        } else {
          // DNS zone exists, so we can delete it
          foundDnsZone = dnsZone;
          return Promise.resolve(true);
        }
      }
    })
    .then(function() {
      // Get zone from NS1 API
      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          // Found zone, delete then
          return Nsone.deleteDnsZone(nsoneZone)
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
    .then(function(result) {
      // DNS zone successfully removed from NS1 and DNSZone collection
      statusResponse  = {
        statusCode: 200,
        message: 'Successfully deleted the DNS zone'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed on/.test(error.message)) {
            return reply(boom.badRequest('Invalid DNS zone provided'));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone does not exist in the system'));
          } else {
            return reply(boom.badImplementation(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:deleteDnsZone');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
      }
    });
};

exports.updateDnsZone = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;
  var statusResponse;

  return Promise.try(function() {
    // Get DNS zone by id
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone not found');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToDNSZone(request, dnsZone)) {
          throw new Error('DNS zone not found');
        } else {
          // Found zone to update
          foundDnsZone = dnsZone;
          return Promise.resolve(true);
        }
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
      // Update the zone with zone_body
      return Nsone.updateDnsZone(updatingNsonsZone, payload.zone_body)
        .then(function(updatedNsoneZone) {
          // successfully updated the zone
          return Promise.resolve(true);
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
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed on/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply('Invalid DNS zone parameters');
            } else {
              return reply('Invalid DNS zone');
            }
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone does not exist in the system'));
          } else {
            return reply(boom.badImplementation(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:updateDnsZone');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
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
      if (!dnsZone) {
        throw new Error('DNS zone not found');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToDNSZone(request, dnsZone)) {
          throw new Error('DNS zone not found');
        } else {
          foundDnsZone = dnsZone;
          return true;
        }
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
        records: nsoneZone.records
      };
      renderJSON(request, reply, null, responseZone);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed on/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply('Invalid DNS zone provided');
            }
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone does not exist in the system'));
          } else {
            return reply(boom.badImplementation(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:getDnsZone');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
      }
    });
};

exports.createDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;
  var statusResponse;

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone not found');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToDNSZone(request, dnsZone)) {
          throw new Error('DNS zone not found');
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

      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, payload.record_domain, payload.record_type)
        .then(function(nsoneRecord) {
          throw new Error('DNS zone record found');
        })
        .catch(function(error) {
          // Not found
          return Promise.resolve(true);
        });
    })
    .then(function() {
      return Nsone.createDnsZoneRecord(
        foundDnsZone.zone,
        payload.record_domain,
        payload.record_type,
        payload.record_body
      )
        .then(function(newNsoneRecord) {
          return newNsoneRecord;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(createdNsoneRecord) {
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
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed on/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply('Invalid DNS zone record provided');
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest('Invalid DNS zone provided for the record domain'));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone does not exist in the system'));
          } else if (/DNS zone record found/.test(error.message)) {
            reply(boom.badRequest('The same DNS zone record already exist in the system'));
          } else {
            return reply(boom.badImplementation(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:createDnsZoneRecord');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
      }
    });
};

exports.deleteDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;
  var statusResponse;

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone not found');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToDNSZone(request, dnsZone)) {
          throw new Error('DNS zone not found');
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

      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, payload.record_domain, payload.record_type)
        .then(function(nsoneRecord) {
          return nsoneRecord;
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
      statusResponse  = {
        statusCode: 200,
        message: 'Successfully deleted the DNS zone record'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed on/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply('Invalid DNS zone record provided');
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest('Invalid DNS zone provided for the record domain'));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone does not exist in the system'));
          } else if (/DNS zone record not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone record does not exist in the system'));
          } else {
            return reply(boom.badImplementation(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:deleteDnsZoneRecord');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
      }
    });
};

exports.updateDnsZoneRecord = function(request, reply) {
  var zoneId = request.params.dns_zone_id;
  var payload = request.payload;
  var foundDnsZone;
  var statusResponse;

  return Promise.try(function() {
    return dnsZones.getAsync(zoneId);
  })
    .then(function(dnsZone) {
      // Check if dns_zone owned by any user
      if (!dnsZone) {
        throw new Error('DNS zone not found');
      } else {
        // Check account access
        if (!utils.checkUserAccessPermissionToDNSZone(request, dnsZone)) {
          throw new Error('DNS zone not found');
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

      return Nsone.getDnsZone(foundDnsZone.zone)
        .then(function(nsoneZone) {
          return Promise.resolve(true);
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function() {
      return Nsone.getDnsZoneRecord(foundDnsZone.zone, payload.record_domain, payload.record_type)
        .then(function(nsoneRecord) {
          return nsoneRecord;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(nsoneRecord) {
      return Nsone.updateDnsZoneRecord(nsoneRecord, payload.record_body)
        .then(function(updatedNsoneRecord) {
          return updatedNsoneRecord;
        })
        .catch(function(error) {
          throw error;
        });
    })
    .then(function(updatedNsoneRecord) {
      statusResponse  = {
        statusCode: 200,
        message: 'Successfully updated the DNS zone record'
      };

      renderJSON(request, reply, null, statusResponse);
    })
    .catch(function(error) {
      if (error.message) {
        // NS1 API request timeout of <x>ms exceeded
        if (/timeout of /.test(error.message)) {
          return reply(boom.badRequest('DNS service unable to process your request now, try again later'));
        } else {
          // Process NS1 Errors
          if (/NS1 API Request Failed on/.test(error.message)) {
            if (/Input validation failed/.test(error.message)) {
              return reply('Invalid DNS zone record provided');
            }
          } else if (/Invalid DNS zone provided for the record domain/.test(error.message)) {
            reply(boom.badRequest('Invalid DNS zone provided for the record domain'));
          } else if (/DNS zone not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone does not exist in the system'));
          } else if (/DNS zone record not found/.test(error.message)) {
            reply(boom.badRequest('DNS zone record does not exist in the system'));
          } else {
            return reply(boom.badImplementation(error.message));
          }
        }
      } else {
        logger.error('Unhandled error at handlers/dnsZone:updateDnsZoneRecord');
        return reply(boom.badImplementation('Unhandled Internal Server Error'));
      }
    });
};
