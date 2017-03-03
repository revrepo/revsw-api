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

var _ = require('lodash');
var mongoose = require('mongoose');
var boom = require('boom');
var AuditLogger = require('../lib/audit');
var config = require('config');
var uuid = require('node-uuid');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON = require('../lib/renderJSON');
var publicRecordFields = require('../lib/publicRecordFields');

var User = require('../models/User');
var BillingPlan = require('../models/BillingPlan');
var Chargify = require('../lib/chargify');
var utils = require('../lib/utilities.js');

var defaultSignupVendorProfile = config.get('default_signup_vendor_profile');
var users = new User(mongoose, mongoConnection.getConnectionPortal());

exports.list = function (request, reply) {
  var vendorSlug = request.query.vendor;
  var options = {
    vendor_profile: vendorSlug || defaultSignupVendorProfile
  };
  // TODO: ??? request.auth == TRUE ???
  if(request.auth.isAuthenticated === true){
    if(!vendorSlug){
      options.vendor_profile = request.auth.credentials.vendor_profile;
    }
  }
  BillingPlan.list(options, function (err, billingPlans) {
    billingPlans = publicRecordFields.handle(billingPlans, 'billingPlans');
    renderJSON(request, reply, err, billingPlans);
  });
};

exports.createBillingPlan = function (request, reply) {
  var requestPayload = request.payload;

  BillingPlan.get({
    name: requestPayload.name
  }, function (err, plan) {

    if (err) {
      return reply(boom.badImplementation('Failed to verify the new billing plan name', err));
    }

    if (plan) {
      return reply(boom.badRequest('The billing plan name is already registered in the system'));
    }

    BillingPlan.add(requestPayload, function (error, result) {

      if (error || !result) {
        return reply(boom.badImplementation('Failed to add new billing plan', error));
      }

      result = publicRecordFields.handle(result, 'billingPlan');
      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully created new billing plan',
          object_id: result.id
        };

        AuditLogger.store({
          activity_type: 'add',
          activity_target: 'billing_plan',
          target_id: result.id,
          target_name: result.name,
          target_object: result,
          operation_status: 'success'
        }, request);

        renderJSON(request, reply, error, statusResponse);
      }

    });
  });
};

exports.get = function (request, reply) {
  var id = request.params.id;
  BillingPlan.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get Billing plan ' + id, error));
    }

    if (result) {
      result = publicRecordFields.handle(result.toJSON(), 'billingPlan');
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Billing plan not found'));
    }
  });
};


exports.updateBillingPlan = function (request, reply) {
  var updatedData = request.payload;
  var id = request.params.id;


  BillingPlan.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to verify Billing plan ' + id, error));
    }

    if (!result) {
      return reply(boom.badRequest('Billing plan not found'));
    }

    updatedData.id = id;
    BillingPlan.updateBillingPlan(updatedData, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update Billing plan ' + id, error));
      }

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the Billing plan'
      };

      result = publicRecordFields.handle(result.toJSON(), 'billingPlan');

      // TODO: Update all current subscribed users

      AuditLogger.store({
        activity_type: 'modify',
        activity_target: 'billing_plan',
        target_id: result.id,
        target_name: result.name,
        target_object: result,
        operation_status: 'success'
      }, request);

      renderJSON(request, reply, error, statusResponse);
    });

  });
};


exports.delete = function (request, reply) {
  var id = request.params.id;
  BillingPlan.get({_id: id}, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Error retrieving Billing Plan ' + id, error));
    }
    if (!result) {
      return reply(boom.badRequest('Billing Plan not found'));
    }

    // Get list of users who uses this billing plan
    users.getUsersUsesBillingPlan(result.id, function(err, users) {
      if (err) {
        return reply(boom.badImplementation('Could not fetch list of users who using billing plan with id : ' + result.id, err));
      }
      if (_.isArray(users) || users.length > 0) {
        return reply(boom.badImplementation('There are users who using billing plan : ' + result.id));
      }
      BillingPlan.removeBillingPlan({_id: id}, function (error) {
        if (error) {
          return reply(boom.badImplementation('Error while removing billing plan with id ' + result.id, error));
        }

        var statusResponse = {
          statusCode: 200,
          message: 'Successfully deleted the Billing plan'
        };

        result = publicRecordFields.handle(result.toJSON(), 'billingPlan');

        AuditLogger.store({
          activity_type: 'delete',
          activity_target: 'billing_plan',
          target_id: result.id,
          target_name: result.name,
          target_object: result,
          operation_status: 'success'
        }, request);

        renderJSON(request, reply, error, statusResponse);
      });

    });
  });
};
