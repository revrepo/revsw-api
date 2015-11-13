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

'use strict';


var mongoose = require('mongoose');
var boom     = require('boom');
var AuditLogger = require('revsw-audit');
var uuid     = require('node-uuid');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');

var User = require('../models/User');
var Location = require('../models/Location');
var BillingPlan = require('../models/BillingPlan');

var users = new User(mongoose, mongoConnection.getConnectionPortal());
var locations = new Location(mongoose, mongoConnection.getConnectionPortal());

exports.signup = function(req, reply) {

  var data = req.payload;

  // Check user email address
  users.get({
    email: data.email
  }, function(err, user) {
    if (err) {
      return reply(boom.badImplementation('Failed to sugnup'));
    }

    if (user) {
      if (user.deleted) {
        return reply(boom.badRequest('User remove error'));
      }
      return reply(boom.badRequest('This email already exist in system'));
    }
    // Fetch billing plan
    BillingPlan.get({_id: data.billing_plan}, function(err, billingPlan) {
      if (err) {
        return reply(boom.badImplementation('Error fetching billing plan'));
      }
      if (!billingPlan) {
        return reply(boom.notFound('No billing plan exist in system'));
      }

      if (!data.company_name) {
        data.company_name = data.first_name + ' ' + data.last_name + '\'s Company';
      }
      data.self_registered = true;
      data.validation = {
        created: Date.new(),
        token: uuid()
      };

      // All ok
      users.add(data, function(err, user) {
        if (err || !user) {
          return reply(boom.badImplementation('Could not add user'));
        }

        var statusResponse;
        if (user) {
          statusResponse = {
            statusCode: 200,
            message: 'Successfully created new user',
            object_id: user.id
          };

          AuditLogger.store({
            ip_address: req.info.remoteAddress,
            datetime: Date.now(),
            //user_id: req.auth.credentials.user_id,
            //user_name: req.auth.credentials.email,
            user_type: 'user',
            account_id: user.id,
//          domain_id        : request.auth.credentials.domain,
            activity_type: 'add',
            activity_target: 'billing_plan',
            target_id: user.id,
            target_name: user.name,
            target_object: user,
            operation_status: 'success'
          });

          //@todo SEND REQUEST TO EBS

          renderJSON(req, reply, err, statusResponse);
        }
      });
    });
  });

};
