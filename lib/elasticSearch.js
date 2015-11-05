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
// var configurl     = require('config');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
  host: config.get('elasticsearch_url'),
  requestTimeout: 60000,
  log: 'trace'
});

var clienturl = new elasticsearch.Client({
  host: config.get('elasticsearch_fullurl_url'),
  requestTimeout: 60000,
  log: 'trace'
});

exports.buildESFilterString = function (request) {
  var filter = '';

  if (request.query.cache_code) {
    if ( request.query.cache_code === 'MISS' ) {
      filter = filter + ' AND (cache: \"MISS\" OR cache: \"-\")';
    } else {
      filter = filter + ' AND cache: \"HIT\"';
    }
  }
  if (request.query.status_code) {
    filter = filter + ' AND response: \"' + request.query.status_code + '\"';
  }
  if (request.query.protocol) {
    filter = filter + ' AND ipport: \"' + ((request.query.protocol === 'HTTP') ? 80 : 443) + '\"';
  }
  if (request.query.http_protocol) {
    filter = filter + ' AND protocol: \"' + request.query.http_protocol + '\"';
  }
  if (request.query.http_method) {
    filter = filter + ' AND method: \"' + request.query.http_method + '\"';
  }
  if (request.query.country) {
    filter = filter + ' AND country_code2: \"' + request.query.country + '\"';
  }
  if (request.query.os) {
    filter = filter + ' AND os: \"' + request.query.os + '\"';
  }
  if (request.query.device) {
    filter = filter + ' AND device: \"' + request.query.device + '\"';
  }
  if (request.query.request_status) {
    filter = filter + ' AND ' + ( ( request.query.request_status === 'OK' ) ? '' : 'NOT ' ) + ' conn_status: \"OK\"';
  }
  if (request.query.quic) {
    filter = filter + ' AND ' + ( ( request.query.quic === 'QUIC' ) ? '' : 'NOT ' ) + ' quic: \"QUIC\"';
  }
  return filter;
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
