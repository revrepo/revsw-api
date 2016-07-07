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

'use strict';

var request = require('superagent');
var config = require('config');
var Promise = require('bluebird');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');

var assign = require('object-assign');

var nsoneConfig = config.get('nsone');
var nsoneAPIUrl = 'https://api.nsone.net/v1/';
var nsoneAPIKey = nsoneConfig.get('api_key');
var nsoneRequestTimeoutSecs = nsoneConfig.get('req_timeout_secs') * 1000;


/***********************************
 *  Send a NS1 API Request based on params
 *
 *  @param {String} method
 *  @param {String} path
 *  @param {Object} params
 *  @returns {Promise}
 */
var sendNsoneRequest = function(method, path, params) {
  return new Promise(function(resolve, reject) {
    // Setup agent request
    var req = request(method, nsoneAPIUrl + path);
    req
      .timeout(nsoneRequestTimeoutSecs)
      .set('X-NSONE-Key', nsoneAPIKey)
      .set('Accept', 'application/json');

    if (method === 'GET') {
      req.query(params);
    } else {
      req.send(params);
    }

    req.end(function(err, res){
        if (err) {
          return reject(err);
        } else {
          return resolve(res.body);
        }
      });
  });
};

/***********************************
 *  Send a NS1 API Request to get a DNS zone
 *
 *  @param {String} zone
 *  @returns {Promise}
 */
var getDnsZone = function(zone) {
  return sendNsoneRequest('GET', 'zones/' + zone, {});
};

/***********************************
 *  Send a NS1 API Request to create new DNS zone
 *
 *  @param {String} zone
 *  @returns {Promise}
 */
var createDnsZone = function(zone) {
  return sendNsoneRequest('PUT', 'zones/' + zone, {zone: zone});
};

/***********************************
 *  Send a NS1 API Request to delete existing DNS zone
 *
 *  @param {Object} dnsZone
 *  @returns {Promise}
 */
var deleteDnsZone = function(dnsZone) {
  return sendNsoneRequest('DELETE', 'zones/' + dnsZone.zone, {});
};

/***********************************
 *  Send a NS1 API Request to update existing DNS zone
 *
 *  @param {Object} dnsZone
 *  @param {Object} updateBody
 *  @returns {Promise}
 */
var updateDnsZone = function(dnsZone, updateBody) {
  var updatedZone = assign({}, dnsZone, updateBody);
  return sendNsoneRequest('POST', 'zones/' + dnsZone.zone, updatedZone);
};

/***********************************
 *  Send a NS1 API Request to get a DNS zone record
 *
 *  @param {String} zone
 *  @param {String} domain
 *  @param {String} recordType
 *  @returns {Promise}
 */
var getDnsZoneRecord = function(zone, domain, recordType) {
  return sendNsoneRequest('GET', 'zones/' + zone + '/' + domain + '/' + recordType, {});
};

/***********************************
 *  Send a NS1 API Request to create new DNS zone record
 *
 *  @param {String} zone
 *  @param {String} domain
 *  @param {String} recordType
 *  @param {Object} body
 *  @returns {Promise}
 */
var createDnsZoneRecord = function(zone, domain, recordType, body) {
  body.zone = zone;
  body.domain = domain;
  body.type = recordType;

  return sendNsoneRequest(
    'PUT',
    'zones/' + zone + '/' + domain + '/' + recordType,
    body
  );
};

/***********************************
 *  Send a NS1 API Request to update existing DNS zone record
 *
 *  @param {Object} dnsRecord
 *  @param {Object} updateBody
 *  @returns {Promise}
 */
var updateDnsZoneRecord = function(dnsRecord, updateBody) {
  var updatedRecord = assign({}, dnsRecord, updateBody);
  return sendNsoneRequest(
    'POST',
    'zones/' + dnsRecord.zone + '/' + dnsRecord.domain + '/' + dnsRecord.type,
    updatedRecord
  );
};

/***********************************
 *  Send a NS1 API Request to delete existing DNS zone record
 *
 *  @param {Object} dnsRecord
 *  @returns {Promise}
 */
var deleteDnsZoneRecord = function(dnsRecord) {
  return sendNsoneRequest(
    'DELETE',
    'zones/' + dnsRecord.zone + '/' + dnsRecord.domain + '/' + dnsRecord.type,
    {}
  );
};

/***********************************
 *  Send a NS1 API Request to get DNS zones usage statistics
 *
 *  @returns {Promise}
 */
var getDnsZonesUsage = function() {
  return sendNsoneRequest(
    'GET',
    'stats/usage',
    {
      aggregate: true,
      by_tier: true,
      expand: true
    }
  );
};

module.exports = {
  getDnsZone: getDnsZone,
  createDnsZone: createDnsZone,
  deleteDnsZone: deleteDnsZone,
  updateDnsZone: updateDnsZone,
  getDnsZonesUsage: getDnsZonesUsage,
  getDnsZoneRecord: getDnsZoneRecord,
  createDnsZoneRecord: createDnsZoneRecord,
  updateDnsZoneRecord: updateDnsZoneRecord,
  deleteDnsZoneRecord: deleteDnsZoneRecord
};



