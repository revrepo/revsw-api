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

var config        = require('config');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
  host: config.get('elasticsearch_url'),
  requestTimeout: 120000,
  log: config.get('elasticsearch_log_level')
});

var clienturl = new elasticsearch.Client({
  host: config.get('elasticsearch_fullurl_url'),
  requestTimeout: 120000,
  log: config.get('elasticsearch_log_level')
});

exports.buildESQueryTerms = function (request) {
  var terms = {
    must: [],
    must_not: []
  };

  if (request.query.cache_code) {
    if ( request.query.cache_code === 'MISS' ) {
      // terms.must.push({ terms: { cache: ['MISS','-'], minimum_should_match : 1 } });
      terms.must.push({ terms: { cache: ['MISS','-'] } });
    } else {
      terms.must.push({ term: { cache: 'HIT' } });
    }
  }
  if (request.query.status_code) {
    terms.must.push({ term: { response: request.query.status_code } });
  }
  if (request.query.protocol) {
    terms.must.push({ term: { ipport: (request.query.protocol === 'HTTP' ? 80 : 443) } });
  }
  if (request.query.http_protocol) {
    terms.must.push({ term: { protocol: request.query.http_protocol } });
  }
  if (request.query.http_method) {
    terms.must.push({ term: { method: request.query.http_method } });
  }
  if (request.query.country) {
    terms.must.push({ term: { 'geoip.country_code2': request.query.country } });
  }
  if (request.query.os) {
    terms.must.push({ term: { os: request.query.os } });
  }
  if (request.query.device) {
    terms.must.push({ term: { device: request.query.device } });
  }
  if (request.query.browser) {
    terms.must.push({ term: { name: request.query.browser } });
  }
  if (request.query.request_status) {
    if ( request.query.request_status === 'OK' ) {
      terms.must.push({ term: { conn_status: 'OK' } });
    } else {
      terms.must_not.push({ term: { conn_status: 'OK' } });
    }
  }
  if (request.query.quic) {
    terms.must.push({ term: { quic: ( request.query.quic === 'QUIC' ? 'QUIC' : '-' ) } });
  }
  if ( request.query.http2 ) {
    terms.must.push({ term: { http2: request.query.http2 } });
  }
  return terms;
};

exports.buildESQueryTerms4SDK = function (request) {
  var terms = {
    must: [],
    must_not: [/*not used yet*/]
  };

  if (request.query.country) {
    terms.must.push({ term: { 'geoip.country_code2': request.query.country } });
  }
  if (request.query.os) {
    terms.must.push({ term: { 'device.os': request.query.os } });
  }
  if (request.query.device) {
    terms.must.push({ term: { 'device.device': request.query.device } });
  }
  if (request.query.operator) {
    if ( request.query.operator === 'Unknown' ) {
      terms.must.push({ terms: { 'carrier.sim_operator': ['_','-','','*'] } });
    }
    else {
      terms.must.push({ term: { 'carrier.sim_operator': request.query.operator } });
    }
  }
  if ( request.query.network ) {
    terms.must.push({ term: { 'carrier.signal_type': request.query.network } });
  }
  return terms;
};


exports.buildMetadataFilterString = function (request) {
  var filter = '';

  if (request.query.cache_code) {
    filter = filter + 'cache_code=' + request.query.cache_code + ';';
  }
  if (request.query.status_code) {
    filter = filter + 'status_code=' + request.query.status_code + ';';
  }
  if (request.query.protocol) {
    filter = filter + 'protocol=' + request.query.protocol + ';';
  }
  if (request.query.http_protocol) {
    filter = filter + 'http_protocol=' + request.query.http_protocol + ';';
  }
  if (request.query.http_method) {
    filter = filter + 'http_method=' + request.query.http_method + ';';
  }
  if (request.query.country) {
    filter = filter + 'country=' + request.query.country + ';';
  }
  if (request.query.os) {
    filter = filter + 'os=\'' + request.query.os + '\';';
  }
  if (request.query.device) {
    filter = filter + 'device=\'' + request.query.device + '\';';
  }
  if (request.query.request_status) {
    filter = filter + 'request_status=' + request.query.request_status +';';
  }
  if (request.query.quic) {
    filter = filter + 'quic=\'' + (request.query.quic === 'QUIC' ? 'QUIC' : '-') +'\';';
  }
  if (request.query.http2) {
    filter = filter + 'http2=\'' + request.query.http2 +'\';';
  }
  return filter;
};


exports.pingES = function () {
  client.ping({
    requestTimeout: 30000,

    // undocumented params are appended to the query string
    hello: 'elasticsearch'
  }, function(error) {
    if (error) {
      console.error('elasticsearch cluster is down!');
    } else {
      console.log('All is well');
    }
    return error;
  });
};


exports.getClient = function () {
  return client;
};

exports.getClientURL = function () {
  return clienturl;
};
