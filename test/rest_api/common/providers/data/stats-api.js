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

// # Stats-API Data Provider object

// Requiring some used resources
var config = require('config');
var promise = require('bluebird');
var request = promise.promisify(require('request'));
var elastic = require('elasticsearch');
var url = require('url');

var Utils = require('./../../../common/utils');

// Defines some methods to generate valid and common StatsAPI test data.
module.exports = {

  DataDrivenHelper: {

    //  accessors
    getTestData: function() { return test_data_; },
    getEstimatedData: function() { return estimated_data_; },
    getESIndexName: function() { return idx_; },

    //  takes the test_data_ and timeshifts all requests to 1hr ago
    //  stores sums and bounds in the estimated_data_
    prepareTestData: function( application ) {
      var notch = Date.now();
      estimated_data_.start_ts = notch;
      estimated_data_.end_ts = 0;
      estimated_data_.hits = test_data_.requests.length;
      test_data_.requests.forEach( function( item ) {
        if ( item.start_ts !== 0 && item.start_ts < estimated_data_.start_ts ) {
          estimated_data_.start_ts = item.start_ts;
        }
        if ( item.end_ts !== 0 && item.end_ts > estimated_data_.end_ts ) {
          estimated_data_.end_ts = item.end_ts;
        }
      });
      notch -= 3600000 + estimated_data_.start_ts;
      estimated_data_.start_ts += notch;
      estimated_data_.end_ts += notch;

      estimated_data_.total_hits = test_data_.requests.length;
      estimated_data_.total_sent = 0;
      estimated_data_.total_received = 0;
      estimated_data_.total_spent_ms = 0;

      test_data_.requests.forEach( function( item ) {
        item.start_ts += notch;
        item.end_ts += notch;
        item.first_byte_ts += notch;
        item.domain = url.parse( ( item.url || '' ) ).hostname || '';
        estimated_data_.total_sent += item.received_bytes;
        estimated_data_.total_received += item.sent_bytes;  //  yes, intentionaly
        estimated_data_.total_spent_ms += ( item.end_ts > item.start_ts ? item.end_ts - item.start_ts : 0 );
      });
      application_id = application.id;
      test_data_.app_name = application.app_name;
      test_data_.sdk_key = application.sdkKey;
      init_elastic_();
      set_index_name_( estimated_data_.start_ts );
    },

    healthcheck: function() {
      return request({
        url: (config.stats_api.server + '/' + config.stats_api.version + '/healthcheck'),
        method: 'GET',
        tunnel: false,
        strictSSL: false, // self signed certs used
        headers: {
          'User-Agent': 'nodejs',
        },
        followRedirect: false,
        timeout: 15000
      });
    },

    uploadTestData: function( num ) {

      var dummy = [];
      dummy.length = num /*stupid hack*/ ;
      return promise.map(dummy, function() {
        return fire1_( test_data_ );
      }, {
        concurrency: 50
      });
    },

    waitForESUploaded: function( goal, logger ) {

      var delay = Math.round( config.stats_api.queue_clear_timeout / 2 );
      //  async loop inside IIFE
      return ( function loop( count ) {
        if (count) {
          logger('wait another ' + delay + 'ms for the indices to be refreshed');
          return promise.delay(delay)
            .then( function() {
              return get_es_count_();
            })
            .then( function( data ) {
              logger('counted ' + data[0].count + '/' + data[1].count + ' messages currently stored in both clusters');
              if ( data[0].count === goal && data[1].count === goal ) {
                return promise.resolve( true );
              }
              return loop( --count );
            });
        }
      })( Math.round( 90000 / delay ) )
        .then(function( res ) {
          if ( !res ) {
            throw new Error( 'messsages amount stored in the ES clusters still not equal to sent amount' );
          }
        });
    },

    //  checkers ------------------------

    //  debug
    logResponse: function() {
      return function( query, response, multiply ) {
        console.log( response.data );
      }
    },

    checkAppAccQuery: function() {
      return function( query, response, multiply ) {
        if ( query.report_type === 'hits' ) {
          response.data.hits.should.be.equal( multiply );
        } else {
          response.data.hits.should.be.equal( multiply );
          response.data.devices_num.should.be.equal( 1 );
        }
      }
    },

    checkDirsQuery: function() {
      return function( query, response, multiply ) {
        response.data.devices.length.should.be.equal( 1 );
        response.data.operators.length.should.be.equal( 1 );
        response.data.oses.length.should.be.equal( 1 );
        response.data.devices[0].should.be.equal( 'iPhone 4S' );
        response.data.operators[0].should.be.equal( 'AT&T' );
        response.data.oses[0].should.be.equal( '9.2' );
      }
    },

    checkFlowQuery: function() {
      return function( query, response, multiply ) {
        response.metadata.total_hits.should.be.equal( multiply * estimated_data_.total_hits );
        response.metadata.total_sent.should.be.equal( multiply * estimated_data_.total_sent );
        response.metadata.total_received.should.be.equal( multiply * estimated_data_.total_received );
        response.metadata.total_spent_ms.should.be.equal( multiply * estimated_data_.total_spent_ms );
      }
    },

    checkAggFlowQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        var fields = {
          status_code: { field: 'status_code', keys: {} },
          destination: { field: 'destination', keys: { 'origin': 'Origin', 'rev_edge': 'RevAPM' } },
          transport: { field: 'edge_transport', keys: { 'standard': 'Standard', 'quic': 'QUIC' } },
          status: { field: 'success_status', keys: { '0': 'Error', '1': 'Success' } },
          cache: { field: 'x-rev-cache', keys: { 'HIT': 'HIT', 'MISS': 'MISS' } }
        };

        test_data_.requests.forEach( function( item ) {
          var key = item[fields[query.report_type].field];
          key = fields[query.report_type].keys[key] || key;
          if ( !aggs[key] ) {
            aggs[key] = {
              hits: 0,
              received_bytes: 0,
              sent_bytes: 0
            };
          }
          aggs[key].hits++;
          aggs[key].received_bytes += item.sent_bytes;
          aggs[key].sent_bytes += item.received_bytes;
        });
        response.data.forEach( function( item ) {
          item.hits.should.be.equal( multiply * aggs[item.key].hits );
          item.received_bytes.should.be.equal( multiply * aggs[item.key].received_bytes );
          item.sent_bytes.should.be.equal( multiply * aggs[item.key].sent_bytes );
        });
      }
    },

    checkTopsQuery: function( count ) {
      return function( query, response, multiply ) {
        var fields = {
          country: ['geoip','country_code2'],
          os: ['device','os'],
          device: ['device','model'],
          operator: ['carrier','net_operator'],
          network: ['carrier','signal_type']
        };
        var key = test_data_[fields[query.report_type][0]][fields[query.report_type][1]];
        count = count || multiply * test_data_.requests.length;
        response.data.length.should.be.equal( 1 );
        response.data[0].key.should.be.equal( key );
        response.data[0].count.should.be.equal( count );
      }
    },

    checkTopGBTQuery: function() {
      return function( query, response, multiply ) {
        var fields = {
          country: ['geoip','country_code2'],
          os: ['device','os'],
          device: ['device','model'],
          operator: ['carrier','net_operator'],
          network: ['carrier','signal_type']
        };
        var key = test_data_[fields[query.report_type][0]][fields[query.report_type][1]];
        response.data.length.should.be.equal( 1 );
        response.data[0].key.should.be.equal( key );
        response.data[0].count.should.be.equal( multiply * test_data_.requests.length );
        response.data[0].received_bytes.should.be.equal( multiply * estimated_data_.total_received );
        response.data[0].sent_bytes.should.be.equal( multiply * estimated_data_.total_sent );
      }
    },

    checkDistributionQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        var fields = {
          status_code: { field: 'status_code', keys: {} },
          destination: { field: 'destination', keys: { 'origin': 'Origin', 'rev_edge': 'RevAPM' } },
          transport: { field: 'edge_transport', keys: { 'standard': 'Standard', 'quic': 'QUIC' } },
          status: { field: 'success_status', keys: { '0': 'Error', '1': 'Success' } },
          cache: { field: 'x-rev-cache', keys: { 'HIT': 'HIT', 'MISS': 'MISS' } },
          domain: { field: 'domain', keys: {} }
        };

        test_data_.requests.forEach( function( item ) {
          var key = item[fields[query.report_type].field];
          key = fields[query.report_type].keys[key] || key;
          if ( !aggs[key] ) {
            aggs[key] = {
              count: 0,
              received_bytes: 0,
              sent_bytes: 0
            };
          }
          aggs[key].count++;
          aggs[key].received_bytes += item.sent_bytes;
          aggs[key].sent_bytes += item.received_bytes;
        });
        response.data.forEach( function( item ) {
          item.count.should.be.equal( multiply * aggs[item.key].count );
          if ( query.report_type === 'status_code' ) {
            item.received_bytes.should.be.equal( 0 );
            item.sent_bytes.should.be.equal( 0 );
          } else {
            item.received_bytes.should.be.equal( multiply * aggs[item.key].received_bytes );
            item.sent_bytes.should.be.equal( multiply * aggs[item.key].sent_bytes );
          }
        });
      }
    },

    checkTopObjectQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        var fields = {
          failed: { field: 'success_status', val: 0 },
          cache_missed: { field: 'x-rev-cache', val: 'MISS' },
          not_found: { field: 'status_code', val: 404 }
        };

        test_data_.requests.forEach( function( item ) {
          if ( !query.report_type ||
               item[fields[query.report_type].field] === fields[query.report_type].val ) {
            if ( !aggs[item.url] ) {
              aggs[item.url] = { count: 0 };
            }
            aggs[item.url].count++;
          }
        });
        response.data.forEach( function( item ) {
          item.count.should.be.equal( multiply * aggs[item.key].count );
        });
      }
    },

    checkTopObjectSlowestQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        var fields = {
          full: 'end_ts',
          first_byte: 'first_byte_ts'
        };

        test_data_.requests.forEach( function( item ) {
          if ( !aggs[item.url] ) {
            aggs[item.url] = { count: 0, val: 0 };
          }
          aggs[item.url].count++;
          var val = item[fields[query.report_type]];
          aggs[item.url].val += ( val > item.start_ts ? val - item.start_ts : 0 );
        });

        response.data.forEach( function( item ) {
          item.count.should.be.equal( multiply * aggs[item.key].count );
          item.val.should.be.equal( Math.round( aggs[item.key].val / aggs[item.key].count ) );
        });
      }
    },

    checkTopObject5xxQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        test_data_.requests.forEach( function( item ) {
          if ( item.status_code >= 500 ) {
            if ( !aggs[item.status_code] ) {
              aggs[item.status_code] = { count: 0 };
            }
            aggs[item.status_code].count++;
          }
        });

        response.data.forEach( function( item ) {
          item.count.should.be.equal( multiply * aggs[item.key].count );
        });
      }
    },

    checkABQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        test_data_.requests.forEach( function( item ) {
          if ( !aggs[item.destination] ) {
            aggs[item.destination] = { count: 0 };
          }
          aggs[item.destination].count++;
        });

        response.data.forEach( function( item ) {
          item.count.should.be.equal( multiply * aggs[item.key].count );
        });

      }
    },

    checkABErrorsQuery: function() {
      return function( query, response, multiply ) {

        var aggs = {};
        test_data_.requests.forEach( function( item ) {
          if ( item.success_status === 0 ) {  //  { 'requests.success_status': 0 }
            if ( !aggs[item.destination] ) {
              aggs[item.destination] = { count: 0 };
            }
            aggs[item.destination].count++;
          }
        });

        response.data.forEach( function( item ) {
          item.count.should.be.equal( multiply * aggs[item.key].count );
        });
      }
    },

  }
};

//  test data ------------------------------------------------------------------------------------//
var ip_ = '8.8.8.8',
  idx_, client_, client_url_,
  application_id,
  estimated_data_ = {};


//  ----------------------------------------------------------------------------------------------//
var init_elastic_ = function() {
  var es = {
    host: config.api.stats.elastic,
    requestTimeout: 120000,
    log: [{
      'type': 'stdio',
      'levels': ['error', 'warning']
    }]
  };
  client_ = new elastic.Client(es);
  var esurl = {
    host: config.api.stats.elastic_url,
    requestTimeout: 120000,
    log: [{
      'type': 'stdio',
      'levels': ['error', 'warning']
    }]
  };
  client_url_ = new elastic.Client(esurl);
};

//  ---------------------------------
//  index name from a date
var set_index_name_ = function(timestamp) {
  var d = new Date(timestamp);
  idx_ = config.stats_api.index_prefix + d.getUTCFullYear() + '.' +
    ('0' + (d.getUTCMonth() + 1)).slice(-2) + '.' +
    ('0' + d.getUTCDate()).slice(-2);
};

//  ---------------------------------
var fire1_ = function(rec) {

  return request({
      url: (config.stats_api.server + '/' + config.stats_api.version + '/stats/apps'),
      method: 'POST',
      json: true,
      body: rec,
      tunnel: false,
      strictSSL: false, // self signed certs used
      headers: {
        'User-Agent': 'nodejs',
        'x-forwarded-for': ip_
      },
      followRedirect: false,
      timeout: 30000
    })
    .then(function(data) {
      return data.body;
    });
};

//  ---------------------------------
var get_es_count_ = function() {
  return promise.all([
    client_.count({
      index: idx_,
      body: { query: { filtered: { filter: { term: { app_id: application_id } } } } }
    }),
    client_url_.count({
      index: idx_,
      body: { query: { filtered: { filter: { term: { app_id: application_id } } } } }
    })
  ]);
};

//  ----------------------------------------------------------------------------------------------//
var test_data_ = {
  log_events: [],
  sdk_version: '1',
  app_name: '',
  sdk_key: '',
  carrier: {
    country_code: '-',
    sim_operator: 'AT&T',
    mcc: '-',
    tower_cell_id_l: '_',
    signal_type: 'WiFi',
    mnc: '-',
    rssi_avg: '_',
    device_id: '_',
    phone_type: '_',
    net_operator: 'AT&T',
    rssi: '_',
    rssi_best: '_',
    tower_cell_id_s: '_',
    network_type: '_'
  },
  version: '1.1',
  network: {
    wifi_gw: '192.168.1.1',
    ip_total_bytes_in: '0',
    rtt: '0',
    tcp_bytes_out: '0',
    udp_bytes_in: '0',
    ip_reassemblies: '0',
    wifi_ip: '192.168.1.128',
    tcp_bytes_in: '0',
    ip_total_bytes_out: '0',
    transport_protocol: '_',
    wifi_extip: '-',
    ip_total_packets_in: '0',
    dns1: '8.8.8.8',
    udp_bytes_out: '0',
    cellular_ip_external: '-',
    tcp_retransmits: '0',
    wifi_dhcp: '_',
    wifi_mask: '255.255.255.0',
    dns2: '-',
    ip_total_packets_out: '0',
    cellular_ip_internal: '-'
  },
  wifi: {
    ssid: 'Rev-A (18:64:72:d4:83:c0)',
    wifi_speed: '_',
    mac: '_',
    wifi_rssi: '_',
    wifi_freq: '_',
    wifi_rssibest: '_',
    wifi_enc: '_',
    wifi_sig: '_'
  },
  location: {
    longitude: 0,
    direction: -1,
    latitude: 0,
    speed: -1
  },
  device: {
    batt_temp: '_',
    cpu_cores: '0',
    imei: '_',
    radio_serial: '_',
    batt_volt: '_',
    serial_number: '_',
    device: 'iPhone4,1 A1387/A1431',
    cpu: '_',
    brand: '_',
    uuid: 'BFF0EEBD-D6FE-4616-A0FB-297C76BB8FDC',
    batt_status: 'unplugged',
    width: '320.000000',
    cpu_number: '1.0',
    os: '9.2',
    batt_cap: 73,
    iccid: '_',
    hight: '480.000000',
    batt_tech: 'Li-Ion',
    phone_number: '1.0',
    meis: '_',
    cpu_sub: '0',
    cpu_freq: '_',
    imsi: '_',
    manufacture: 'Apple',
    model: 'iPhone 4S'
  },
  geoip: {
    country_code2: 'US',
    region_name: 'CA',
    city_name: 'Mountain View'
  },
  requests: [{
    end_ts: 1453424149123,
    start_ts: 1453424148998,
    protocol: '-',
    url: 'https://data.coremetrics.com/cm?ci=50200000%7CGLOBAL&st=1453424123974&vn1=4.18.130&ec=utf-8&pi=ibm.com&ul=http%3A%2F%2Fibm.com&cjen=1&cjuid=89788096925214527484056&cjsid=1453424124&cjvf=1&tid=8&ti=1453424148986&hr=http%3A%2F%2Fwww.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/gif',
    received_bytes: 43,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform, pre-check=0, post-check=0, private',
    conn_id: 291,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424149121
  }, {
    end_ts: 1453424149152,
    start_ts: 1453424148985,
    protocol: '-',
    url: 'https://data.coremetrics.com/cm?tid=15&ci=50200000%7CGLOBAL&vn2=e4.0&st=1453424123974&vn1=4.18.130&ec=utf-8&eid=www.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&ecat=page%20click&rnd=1453424938374&e_a1=page%20click&e_a2=www.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&e_a3=Marketplace&e_a4=null&e_a5=null&e_a6=null&e_a7=www.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&e_a8=Marketplace&e_a9=null&e_a12=ibm.com&e_a18=1453424120582&e_a19=http%3A%2F%2Fibm.com%2F&e_a20=1453424148968&e_a21=0&ul=http%3A%2F%2Fibm.com%2F&cjen=1&cjuid=89788096925214527484056&cjsid=1453424124&cjvf=1',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/gif',
    received_bytes: 43,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform, pre-check=0, post-check=0, private',
    conn_id: 290,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424149150
  }, {
    end_ts: 1453424149552,
    start_ts: 1453424149381,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/cloud/us/en-us',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/html; charset=utf-8',
    received_bytes: 74768,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=7200',
    conn_id: 293,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424149549
  }, {
    end_ts: 1453424155465,
    start_ts: 1453424152517,
    protocol: '-',
    url: 'https://app.resrc.it/O=100/https://static.ibmserviceengage.com/APImanagementCloud-hero.jpg',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/jpeg',
    received_bytes: 193494,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=14974170, no-transform',
    conn_id: 311,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424155461
  }, {
    end_ts: 1453424155555,
    start_ts: 1453424154977,
    protocol: '-',
    url: 'http://cloudfront-labs.amazonaws.com/test.png',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/plain',
    received_bytes: 58,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=0',
    conn_id: 349,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424155553
  }, {
    end_ts: 1453424155616,
    start_ts: 1453424153304,
    protocol: '-',
    url: 'https://tags.tiqcdn.com/utag/ibm/main/prod/utag.699.js?utv=ut4.39.201601212322',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/javascript',
    received_bytes: 208673,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=2592000',
    conn_id: 323,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424155613
  }, {
    end_ts: 1453424155654,
    start_ts: 1453424153302,
    protocol: '-',
    url: 'https://tags.tiqcdn.com/utag/ibm/main/prod/utag.694.js?utv=ut4.39.201601151731',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 232445,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=1296000',
    conn_id: 322,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424155651
  }, {
    end_ts: 1453424156387,
    start_ts: 1453424156330,
    protocol: '-',
    url: 'https://libs.coremetrics.com/ddxlibs/json-min.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 4919,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 353,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424156385
  }, {
    end_ts: 1453424156518,
    start_ts: 1453424156264,
    protocol: '-',
    url: 'https://insights.hotjar.com/api/v1/sites/42920/pages/149645866/content-id/093b66f0b4f3a7506261637567583d11',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/json',
    received_bytes: 17,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 352,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424156516
  }, {
    end_ts: 1453424156732,
    start_ts: 1453424156658,
    protocol: '-',
    url: 'http://media.ibm.com/mluniversal-1x1.gif',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/gif',
    received_bytes: 43,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=18000',
    conn_id: 358,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424156731
  }, {
    end_ts: 1453424157088,
    start_ts: 1453424156777,
    protocol: '-',
    url: 'http://insight.adsrvr.org/pixel?id=2179083&t=2&piggyback=http%3A%2F%2Fad.yieldmanager.com%2Fcms%2Fv1%3Fesig%3D1~fac06801624107e5d8ee63717a17d281e39cf167%26nwid%3D10000480789%26sigv%3D1&ttd_tdid=6b20b7d7-a225-465a-8f0b-fe2e90090b1b',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: '-',
    received_bytes: 0,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 360,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424157087
  }, {
    end_ts: 1453424157125,
    start_ts: 1453424156659,
    protocol: '-',
    url: 'https://insights.hotjar.com/api/v1/sites/42920/pages/149645866/content',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/html; charset=utf-8',
    received_bytes: 0,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 357,
    sent_bytes: 128,
    method: 'OPTIONS',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424157122
  }, {
    end_ts: 1453424157300,
    start_ts: 1453424157165,
    protocol: '-',
    url: 'http://insight.adsrvr.org/track/cmb/appnexus?ttd=1&anid=0&ttd_tdid=f77edbd1-82e8-4b1d-bdce-98cd7dea7d72',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/gif',
    received_bytes: 70,
    'x-rev-cache': 'MISS',
    local_cache_status: 'private,no-cache, must-revalidate',
    conn_id: 363,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424157298
  }, {
    end_ts: 1453424158398,
    start_ts: 1453424157264,
    protocol: '-',
    url: 'https://insights.hotjar.com/api/v1/sites/42920/pages/149645866/content',
    success_status: 0,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 503,
    destination: 'rev_edge',
    cont_type: 'text/html; charset=utf-8',
    received_bytes: 284,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 364,
    sent_bytes: 128,
    method: 'POST',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424158397
  }, {
    end_ts: 1453424158649,
    start_ts: 1453424157412,
    protocol: '-',
    url: 'https://sales.liveperson.net/visitor/addons/deploy2.asp?site=3815120&d_id=ibmUSNew&default=simpleDeploy',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 25671,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=3600, s-maxage=3600',
    conn_id: 365,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424158646
  }, {
    end_ts: 1453424158877,
    start_ts: 1453424158685,
    protocol: '-',
    url: 'https://sales.liveperson.net/hcp/html/mTag.js?site=3815120',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/javascript',
    received_bytes: 17753,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 366,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424158874
  }, {
    end_ts: 1453424159322,
    start_ts: 1453424159022,
    protocol: '-',
    url: 'https://sales.liveperson.net/hc/3815120/?&site=3815120&cmd=mTagKnockPage&lpCallId=787118292180-252002401743&protV=20&lpjson=1&id=7265152989&javaSupport=false&visitorStatus=INSITE_STATUS&dbut=chat-gtscloud-usen%7ClpMTagConfig.db1%7Clpbutton%7C',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 55538,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-store',
    conn_id: 367,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424159320
  }, {
    end_ts: 1453424159537,
    start_ts: 1453424159396,
    protocol: '-',
    url: 'https://sales.liveperson.net/hc/3815120/?&visitor=1131902353407369&msessionkey=5526318755879990156&siteContainer=STANDALONE&site=3815120&cmd=mTagStartPage&lpCallId=198203690350-541417648782&protV=20&lpjson=1&page=http%3A//www.ibm.com/marketplace/cloud/us/en-us&id=7265152989&javaSupport=false&visitorStatus=INSITE_STATUS&defInvite=chat-gtscloud-usen&activePlugin=none&cobrowse=true&PV%21unit=gtscloud&PV%21pageLoadTime=5%20sec&PV%21visitorActive=1&SV%21language=usen&SV%21defaultStyle=&title=IBM%20Marketplace&referrer=http%3A//ibm.com/&cobrowse=true',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 2406,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-store',
    conn_id: 368,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424159535
  }, {
    end_ts: 1453424159831,
    start_ts: 1453424159584,
    protocol: '-',
    url: 'https://sales.liveperson.net/hc/3815120/?&visitor=1131902353407369&msessionkey=5526318755879990156&siteContainer=STANDALONE&site=3815120&cmd=mTagUrl&lpCallId=640466537326-409962075064&protV=20&lpjson=1&SV%21impression-query-name=chat-gtscloud-usen&SV%21impression-query-room=chat-gtscloud-usen&id=7265152989&info=button-impression%3Achat-gtscloud-usen%28IBM%20Marketplace%29&waitForVisitor=true&d=1453424159575&page=http%3A//sales.liveperson.net/hcp/width/img40.gif',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 119,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-store',
    conn_id: 369,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424159829
  }, {
    end_ts: 1453424159884,
    start_ts: 1453424159596,
    protocol: '-',
    url: 'https://sales.liveperson.net/hc/3815120/?&visitor=1131902353407369&msessionkey=5526318755879990156&siteContainer=STANDALONE&site=3815120&cmd=mTagInPage&lpCallId=394148818682-018558732467&protV=20&lpjson=1&page=http%3A//www.ibm.com/marketplace/cloud/us/en-us&id=7265152989&javaSupport=false&visitorStatus=INSITE_STATUS&defInvite=chat-gtscloud-usen&activePlugin=none&cobrowse=true&cobrowse=true',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 188,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-store',
    conn_id: 370,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424159882
  }, {
    end_ts: 1453424160636,
    start_ts: 1453424160461,
    protocol: '-',
    url: 'https://sales.liveperson.net/hc/3815120/?lpCallId=365221475251-619959348579&protV=20&lpjson=5&site=3815120&cmd=leVisitorEvent&type=impression&appKey=f907f2d9acd64b7f8c00b83bed3c2822&data=dynBut%3A142',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 94,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-store',
    conn_id: 371,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424160634
  }, {
    end_ts: 1453424163541,
    start_ts: 1453424163398,
    protocol: '-',
    url: 'https://data.coremetrics.com/cm?tid=15&ci=50200000%7CECOM&vn2=e4.0&st=1453424154189&vn1=4.18.130&ec=utf-8&eid=www.ibm.com%2Fmarketplace%2Fnext%2Fsearch%2Fus%2Fen-us&ecat=page%20click&rnd=1453434093163&e_a1=page%20click&e_a2=www.ibm.com%2Fmarketplace%2Fnext%2Fsearch%2Fus%2Fen-us&e_a3=explore%20all%20cloud%20products&e_a4=null&e_a5=null&e_a6=null&e_a7=www.ibm.com%2Fmarketplace%2Fnext%2Fsearch%2Fus%2Fen-us&e_a8=explore%20all%20cloud%20products&e_a9=null&e_a12=www.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&e_a18=1453424153066&e_a19=http%3A%2F%2Fwww.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&e_a20=1453424163363&e_a21=0&ul=http%3A%2F%2Fwww.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&rf=http%3A%2F%2Fibm.com%2F&cjen=1&cjuid=89788096925214527484056&cjsid=1453424124&cjvf=1',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/gif',
    received_bytes: 43,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform, pre-check=0, post-check=0, private',
    conn_id: 372,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424163539
  }, {
    end_ts: 1453424163582,
    start_ts: 1453424163422,
    protocol: '-',
    url: 'https://data.coremetrics.com/cm?ci=50200000%7CECOM&st=1453424154189&vn1=4.18.130&ec=utf-8&pi=www.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&rf=http%3A%2F%2Fibm.com%2F&ul=http%3A%2F%2Fwww.ibm.com%2Fmarketplace%2Fcloud%2Fus%2Fen-us&cjen=1&cjuid=89788096925214527484056&cjsid=1453424124&cjvf=1&tid=8&ti=1453424163412&hr=https%3A%2F%2Fwww.ibm.com%2Fmarketplace%2Fnext%2Fsearch%2Fus%2Fen-us',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'http',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'image/gif',
    received_bytes: 43,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform, pre-check=0, post-check=0, private',
    conn_id: 373,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424163580
  }, {
    end_ts: 1453424163698,
    start_ts: 1453424163465,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us',
    success_status: 0,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 303,
    destination: 'rev_edge',
    cont_type: 'text/html; charset=UTF-8',
    received_bytes: 99,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 374,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424163689
  }, {
    end_ts: 1453424169791,
    start_ts: 1453424169315,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/html; charset=utf-8',
    received_bytes: 83549,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 375,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424169788
  }, {
    end_ts: 1453424170348,
    start_ts: 1453424170112,
    protocol: '-',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/3.0.3/handlebars.min.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/javascript; charset=utf-8',
    received_bytes: 65466,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=30672000',
    conn_id: 377,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170345
  }, {
    end_ts: 1453424170443,
    start_ts: 1453424170119,
    protocol: '-',
    url: 'https://www.ibm.com/common/stats/ida_production.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 17689,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=604800',
    conn_id: 379,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170441
  }, {
    end_ts: 1453424170510,
    start_ts: 1453424170144,
    protocol: '-',
    url: 'https://www.ibm.com/common/translations/us/en/translations.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 2892,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=301',
    conn_id: 380,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170508
  }, {
    end_ts: 1453424170574,
    start_ts: 1453424170187,
    protocol: '-',
    url: 'https://service.maxymiser.net/cdn/ibm/js/mmcore.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 10826,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=1800',
    conn_id: 386,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170572
  }, {
    end_ts: 1453424170614,
    start_ts: 1453424170181,
    protocol: '-',
    url: 'https://1.www.s81c.com/common/js/dynamicnav/www/countrylist/usen-utf8.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 12226,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=11733',
    conn_id: 385,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170612
  }, {
    end_ts: 1453424170662,
    start_ts: 1453424170152,
    protocol: '-',
    url: 'https://1.www.s81c.com/common/js/dynamicnav/www/usen-utf8.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 33815,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=11534',
    conn_id: 381,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170659
  }, {
    end_ts: 1453424170716,
    start_ts: 1453424170159,
    protocol: '-',
    url: 'https://www.ibm.com/common/v18/translations/usen.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 14575,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=86400',
    conn_id: 382,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170714
  }, {
    end_ts: 1453424170755,
    start_ts: 1453424170075,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/css/min/main.css',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/css; charset=UTF-8',
    received_bytes: 27408,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=86400',
    conn_id: 376,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170753
  }, {
    end_ts: 1453424170795,
    start_ts: 1453424170114,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/js/min/main.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/javascript',
    received_bytes: 27704,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=86400',
    conn_id: 378,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170792
  }, {
    end_ts: 1453424170854,
    start_ts: 1453424170166,
    protocol: '-',
    url: 'https://www.ibm.com/gateway/secstate/?cc=us&lc=en&format=json&ts=1453424170157&cb=109%3AIBMCore.common.util.user.setUserSigninState&_=1453424170016',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/json',
    received_bytes: 198,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=301, max-age=301',
    conn_id: 383,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170851
  }, {
    end_ts: 1453424170895,
    start_ts: 1453424170174,
    protocol: '-',
    url: 'https://www.ibm.com/gateway/secstate/?cc=us&lc=en&format=json&ts=1453424170165&cb=100%3AIBMCore.www.util.greeting.serviceCallback&_=1453424170017',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/json',
    received_bytes: 77,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=301, max-age=301',
    conn_id: 384,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170892
  }, {
    end_ts: 1453424170938,
    start_ts: 1453424170643,
    protocol: '-',
    url: 'https://service.maxymiser.net/cg/v5us/?fv=dmn%3Dibm.com%3Bref%3Dhttps%253A%2F%2Fwww.ibm.com%2Fmarketplace%2Fnext%2Fsearch%2Fus%2Fen-us%3Burl%3Dhttps%253A%252F%252Fwww.ibm.com%252Fmarketplace%252Fnext%252Fsearch%252Fus%252Fen-us%252F%3Bscrw%3D320%3Bscrh%3D480%3Bclrd%3D32%3Bcok%3D1%3B&pd=-913128662%257CBwAAAAoBQpCEaBHlDByiOAUEAFtlELrGItNIDwAAAIHj%2F%2BTrHdNIAAAAAP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAZEaXJlY3QB5QwEAAAAAAAAAAAAAP%2BMAACAigAA%2F4wAAAAAAAAAAUU%253D&srv=lvsvwcgus08&tst=0.028&mmid=-2026807208%7CBwAAAAqQhGgR5QwAAA%3D%3D&jsver=5.14.1&ri=1&rul=',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/javascript; charset=utf-8',
    received_bytes: 624,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-store, no-cache, must-revalidate,post-check=0, pre-check=0',
    conn_id: 388,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424170935
  }, {
    end_ts: 1453424171431,
    start_ts: 1453424171072,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/api/search?q=type%3Aproduct&limit=4',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/plain; charset=utf-8',
    received_bytes: 4035,
    'x-rev-cache': 'MISS',
    local_cache_status: 'private, max-age=0',
    conn_id: 389,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171428
  }, {
    end_ts: 1453424171461,
    start_ts: 1453424171087,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/api/search?q=type%3Aproduct&limit=0&counts=%5B%22servicetype%22%5D',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/plain; charset=utf-8',
    received_bytes: 155,
    'x-rev-cache': 'MISS',
    local_cache_status: 'private, max-age=0',
    conn_id: 390,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171459
  }, {
    end_ts: 1453424171504,
    start_ts: 1453424171247,
    protocol: '-',
    url: 'https://1.www.s81c.com/common/v18/js/liveperson.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/x-javascript',
    received_bytes: 3430,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=58259',
    conn_id: 395,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171501
  }, {
    end_ts: 1453424171550,
    start_ts: 1453424171094,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/api/search?q=type%3Aproduct&limit=0&counts=%5B%22role%22%5D',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/plain; charset=utf-8',
    received_bytes: 352,
    'x-rev-cache': 'MISS',
    local_cache_status: 'private, max-age=0',
    conn_id: 391,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171548
  }, {
    end_ts: 1453424171596,
    start_ts: 1453424171103,
    protocol: '-',
    url: 'https://www.ibm.com/marketplace/next/search/us/en-us/api/search?q=type%3Aproduct&limit=0&counts=%5B%22category%22%5D',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/plain; charset=utf-8',
    received_bytes: 431,
    'x-rev-cache': 'MISS',
    local_cache_status: 'private, max-age=0',
    conn_id: 392,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171594
  }, {
    end_ts: 1453424171635,
    start_ts: 1453424171131,
    protocol: '-',
    url: 'https://1.www.s81c.com/common/fonts/icons-ibm-v3.svg#icons-ibm-v3',
    success_status: 0,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 404,
    destination: 'rev_edge',
    cont_type: 'text/html',
    received_bytes: 7008,
    'x-rev-cache': 'MISS',
    local_cache_status: 'no-cache',
    conn_id: 393,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171634
  }, {
    end_ts: 1453424171722,
    start_ts: 1453424170473,
    protocol: '-',
    url: 'https://www.ibm.com/gateway/secstate/?cc=us&lc=en&format=json&ts=1453424170458&v=17&wtmcategory=SB07&cb=206%3AIBMCore.www.module.dynamiccontactmodule.contactboxcallback&_=1453424170018',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/json',
    received_bytes: 796,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=301, no-cache=\"set-cookie, set-cookie2\"',
    conn_id: 387,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171719
  }, {
    end_ts: 1453424171802,
    start_ts: 1453424171199,
    protocol: '-',
    url: 'https://tags.tiqcdn.com/utag/ibm/main/prod/utag.js',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/javascript',
    received_bytes: 125275,
    'x-rev-cache': 'HIT',
    local_cache_status: 'max-age=300',
    conn_id: 394,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424171799
  }, {
    end_ts: 1453424172642,
    start_ts: 1453424172456,
    protocol: '-',
    url: 'https://static.ibmserviceengage.com/tile-analytics-group-collaboration.jpg',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/octet-stream',
    received_bytes: 4243,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=86400',
    conn_id: 396,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424172640
  }, {
    end_ts: 1453424172690,
    start_ts: 1453424172480,
    protocol: '-',
    url: 'https://static.ibmserviceengage.com/tile-security-on-the-go.jpg',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/octet-stream',
    received_bytes: 2781,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=86400',
    conn_id: 398,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424172688
  }, {
    end_ts: 1453424172738,
    start_ts: 1453424172536,
    protocol: '-',
    url: 'https://fast.fonts.net/t/trackingCode.js?_=1453424170019',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/javascript',
    received_bytes: 650,
    'x-rev-cache': 'MISS',
    local_cache_status: 'max-age=0',
    conn_id: 399,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424172736
  }, {
    end_ts: 1453424172782,
    start_ts: 1453424172473,
    protocol: '-',
    url: 'https://static.ibmserviceengage.com/tile-analytics-analyzing-computer.jpg',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'application/octet-stream',
    received_bytes: 3451,
    'x-rev-cache': 'MISS',
    local_cache_status: 'public, max-age=86400',
    conn_id: 397,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424172778
  }, {
    end_ts: 1453424173036,
    start_ts: 1453424172542,
    protocol: '-',
    url: 'https://d31qbv1cthcecs.cloudfront.net/atrk.js?_=1453424170020',
    success_status: 1,
    keepalive_status: 1,
    transport_protocol: 'https',
    status_code: 200,
    destination: 'rev_edge',
    cont_type: 'text/javascript',
    received_bytes: 3725,
    'x-rev-cache': 'MISS',
    local_cache_status: '-',
    conn_id: 400,
    sent_bytes: 128,
    method: 'GET',
    edge_transport: 'quic',
    network: '-',
    cont_encoding: '-',
    first_byte_ts: 1453424173035
  }]
};



