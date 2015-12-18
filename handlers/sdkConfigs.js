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

var mongoose        = require('mongoose');
var boom            = require('boom');
var config          = require('config');
var cds_request     = require('request');
var renderJSON      = require('../lib/renderJSON');

exports.getSDKConfig = function(request, reply) {
  var sdk_key = request.params.sdk_key;
  var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
  var options = (request.query.staging && request.query.staging === true) ? '?staging=true' : '';

  cds_request({url: config.get('cds_url') + '/v1/sdk/config/' + sdk_key + options, headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get the mobile app configuration from the CDS for SDK key ' + sdk_key));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else{
      renderJSON(request, reply, err, response_json);
    }
  });
};
