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
var boom     = require('boom');
var config = require('config');
var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');
var utils = require('../lib/utilities.js');

var ServerGroup = require('../models/ServerGroup');
var Location = require('../models/Location');
var Account = require('../models/Account');

var servergroups = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var locations = new Location(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

var BP_GROUP_ID_DEFAULT_ = config.get('bp_group_id_default');

/**
 * @name getFirstMileLocations
 * @description method return all avalibel Firdt Mile Locations
 *
 * @param {*} request
 * @param {*} reply
 */
exports.getFirstMileLocations = function(request, reply) {
  var accountId = request.query.account_id;
  var parentAccountId = utils.getAccountID(request,true);
  var optionsForServerGroup = {};
  var listOfSites = [];
  // NOTE: main workflow
  async.waterfall([
    function chekPermissionToParentAccount(cb) {
      if (!!accountId && !utils.checkUserAccessPermissionToAccount(request, accountId)) {
        return cb(boom.badRequest('Account ID not found'));
      }else{
        if(!!accountId){
          parentAccountId =  accountId;
        }
      }
      cb();
    },
    function(cb){
      if(request.auth.credentials.role === 'revadmin'){
        cb();
      }else{
        accounts.get({_id: parentAccountId},function(err,accountData){
          if(err || !accountData){
            return cb(boom.badImplementation('Account not found'));
          }
          if(accountData && accountData.bp_group_id){
            optionsForServerGroup.bp_group_id = accountData.bp_group_id;
          }else{
            // NOTE: default BP Group Id
            optionsForServerGroup.bp_group_id = BP_GROUP_ID_DEFAULT_;
          }
          cb();
        });
      }
    },
    function(cb){
      servergroups.listFirstMileLocations(optionsForServerGroup,function(error, result) {
        if (error) {
          return cb(boom.badImplementation('Failed to retrive from the database a list of first mile locations'));
        }
        if (result) {
          for (var i = 0; i < result.length; i++) {
            listOfSites.push({
              locationName: result[i].publicName,
              id: result[i]._id.toString()
            });
          }
          cb();
        } else {
          return cb(boom.badRequest('No first mile locations are registered in the system'));
        }
      });
    },
    function rormatResponse(cb){
      cb(null,listOfSites );
    }
  ],function(error,result){
    if(error && error.isBoom){
      return reply(error);
    }
    renderJSON(request, reply, error, result);
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
