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

var mongoose    = require('mongoose');
var boom        = require('boom');
var uuid        = require('node-uuid');
var AuditLogger = require('revsw-audit');
var config      = require('config');
var cds_request = require('request');

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var DomainConfig   = require('../models/DomainConfig');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

exports.getDomainConfigStatus = function(request, reply) {

  var domain_id = request.params.domain_id;
  cds_request( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + '/config_status',
    headers: {
      Authorization: 'Bearer ' + config.get('cds_api_token')
    }
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get from CDS the configuration status for domain ' + domain_id));
    }
    var response_json = JSON.parse(body);
    if ( res.statusCode === 400 ) {
      return reply(boom.badRequest(response_json.message));
    } else {
      renderJSON(request, reply, err, response_json);
    }
  });
};


exports.getDomainConfigs = function(request, reply) {

};

exports.getDomainConfig = function(request, reply) {

};

exports.createDomainConfig = function(request, reply) {

};

exports.updateDomainConfig = function(request, reply) {

};

exports.deleteDomainConfig = function(request, reply) {

};
