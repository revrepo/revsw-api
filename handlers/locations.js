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

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');

var ServerGroup = require('../models/ServerGroup');
var Location = require('../models/Location');

var servergroups = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var locations = new Location(mongoose, mongoConnection.getConnectionPortal());


exports.getFirstMileLocations = function(request, reply) {

  servergroups.listFirstMileLocations(function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the database a list of first mile locations'));
    }
    if (result) {
      var listOfSites = [];
      for (var i = 0; i < result.length; i++) {
        listOfSites.push({
          locationName: result[i].publicName,
          id: result[i]._id.toString()
        });
      }

      renderJSON(request, reply, error, listOfSites);
    } else {
      return reply(boom.badRequest('No first mile locations are registered in the system'));
    }
  });
};

exports.getLastMileLocations = function(request, reply) {

  locations.listLastMileLocations(function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the database a list of last mile locations'));
    }
    if (result) {
      var listOfSites = [];
      for (var i = 0; i < result.length; i++) {
        listOfSites.push({
          id: result[i]._id.toString(),
          site_code_name: result[i].site_code_name,
          city: result[i].city,
          state: result[i].state,
          country: result[i].country,
          billing_zone: result[i].billing_zone
        });
      }
      renderJSON(request, reply, error, listOfSites);
    } else {
      return reply(boom.badRequest('No last mile locations are registered in the system'));
    }
  });
};

exports.getBillingZones = function(request, reply) {
  var options = {};
  locations.listBillingZones(options, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the database a Billing Zones'));
    }
    if (result) {
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('No Billing Zones are registered in the system'));
    }
  });
};
