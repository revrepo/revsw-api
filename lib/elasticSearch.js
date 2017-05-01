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

//  ----------------------------------------------------------------------------------------------//

//  makes the linter happy
var updateByRequest_ = function( subquery, request ) {
  if (request.query.cache_code) {
    if ( request.query.cache_code === 'MISS' ) {
      subquery.must.push({ terms: { cache: ['MISS','-'] } });
    } else {
      subquery.must.push({ term: { cache: 'HIT' } });
    }
  }
  if (request.query.status_code) {
    subquery.must.push({ term: { response: request.query.status_code } });
  }
  if (request.query.protocol) {
    subquery.must.push({ term: { ipport: (request.query.protocol === 'HTTP' ? 80 : 443) } });
  }
  if (request.query.http_protocol) {
    subquery.must.push({ term: { protocol: request.query.http_protocol } });
  }
  if (request.query.http_method) {
    subquery.must.push({ term: { method: request.query.http_method } });
  }
  if (request.query.country) {
    subquery.must.push({ term: { 'geoip.country_code2': request.query.country } });
  }
  if (request.query.os) {
    subquery.must.push({ term: { os: request.query.os } });
  }
  if (request.query.device) {
    subquery.must.push({ term: { device: request.query.device } });
  }
  if (request.query.browser) {
    subquery.must.push({ term: { name: request.query.browser } });
  }
  if (request.query.request_status) {
    if ( request.query.request_status === 'OK' ) {
      subquery.must.push({ term: { conn_status: 'OK' } });
    } else {
      subquery.must_not.push({ term: { conn_status: 'OK' } });
    }
  }
  if (request.query.quic) {
    subquery.must.push({ term: { quic: ( request.query.quic === 'QUIC' ? 'QUIC' : '-' ) } });
  }
  if ( request.query.http2 ) {
    subquery.must.push({ term: { http2: request.query.http2 } });
  }
  // NOTE: only for NAXSI
  if ( request.query.zone ) {
    subquery.must.push({ term: { zone: request.query.zone.toUpperCase() } });
  }
  if ( request.query.rule_id ) {
    subquery.must.push({ term: { id: request.query.rule_id } });
  }
};

//  ---------------------------------
var updateByDomainConfig_ = function( subquery, domainConfig ) {
  var dName = domainConfig.domain_name;
  var or = [];

  if ( domainConfig.proxy_config ) {
    if ( domainConfig.proxy_config.domain_aliases ) {
      or.push({ terms: { domain: [].concat( domainConfig.proxy_config.domain_aliases, [dName] ) } });
    }
    if ( domainConfig.proxy_config.domain_wildcard_alias ) {
      if ( domainConfig.proxy_config.domain_wildcard_alias.constructor === Array ) {
        //  in a crazy case the domain has an array of wildcard aliases
        domainConfig.proxy_config.domain_wildcard_alias.forEach( function( alias ) {
          or.push({
            regexp: {
              domain: alias.replace( /\./g, '\\.' ).replace( /\*/g, '.*' )
            }
          });
        });
      } else {
        or.push({
          regexp: {
            domain: domainConfig.proxy_config.domain_wildcard_alias.replace( /\./g, '\\.' ).replace( /\*/g, '.*' )
          }
        });
      }
    }
  }

  if ( or.length > 1 ) {
    subquery.must.push({ or: or });
  } else if ( or.length === 1 ) {
    subquery.must.push( or[0] );
  } else {
    subquery.must.push({ term: { domain: dName } });
  }
};

/** *********************************
 *  buildESQueryTerms - creates ES search filter terms
 *
 *  @param {object} - part of query to push result into, assuming `query: { filtered: { filter: { bool: {} } } } ...`
 *  @param {object} - hapi request object to get parameters from, or false
 *  @param {object} - domains config object to get parameters from, or false
 */
exports.buildESQueryTerms = function (subquery, request, domainConfig) {

  if ( !subquery.must_not ) {
    subquery.must_not = [];
  }
  if ( !subquery.must ) {
    subquery.must = [];
  }

  if ( request ) {
    updateByRequest_( subquery, request );
  }

  if ( domainConfig ) {
    updateByDomainConfig_( subquery, domainConfig );
  }
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
  if (request.query.browser) {
    filter = filter + 'browser=\'' + request.query.browser + '\';';
  }
  // NOTE: naxsi
  if (request.query.zone) {
    filter = filter + 'zone=\'' + request.query.zone + '\';';
  }
  if (request.query.rule_id) {
    filter = filter + 'rule_id=\'' + request.query.rule_id + '\';';
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
