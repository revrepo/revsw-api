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

//  stats endpoint data management

//  The stats endpoint inherently has no CRUD functionality except maybe (R)etrieve
//  to some extent in terms of aggregations. Thus it has no methods to create/delete data even
//  for a testing. So here are methods to generate/read, upload and finally remove testing data
//  working directly with the elasticsearch interfaces

'use strict';
var _ = require('lodash'),
  elastic = require('elasticsearch'),
  config = require( 'config' ),
  promise = require('bluebird'),
  fs = promise.promisifyAll(require('fs'));


//  ----------------------------------------------------------------------------------------------//


var client_ = false,
  type_ = 'apache_json_testing',
  client_i_ = false,
  type_i_ = 'apache_json',
  file_ = __dirname + '/statsData.json';

var opts = {
  index: false,
  from: 0,
  to: 0,
  data: [],
  dataCount: 0,
  aggs: {},
  _ids: []
};

//  init parameters
var init_ = function(  ) {
  client_ = new elastic.Client({
    host: config.api.stats.elastic_test,
    requestTimeout: 60000,
    // log: 'trace'
    log: [{
      type: 'stdio',
      levels: [ 'error', 'warning' ]
    }]
  });

  //  yesterday's index name
  var d = new Date( Date.now() - ( 24 * 3600000 ) );
  opts.index = 'logstash-' + d.getUTCFullYear() + '.' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d.getUTCDate()).slice(-2);

  //  working timestamp interval
  opts.from = Math.floor( Date.now() / ( 3600000 * 24 ) - 1 ) * 3600000 * 24;
  opts.to = opts.from + 3600000 * 3;
};


//  ----------------------------------------------------------------------------------------------//

module.exports = {


  /**
   * Stats DataProvider.options
   *
   * {Object} containing data for testing and comparison
   {
      index       - index name figured from yesterday's date like "logstash-2015.11.11"
      from        - start interval timestamp
      to          - end interval timestamp
      data        - loaded data
      dataCount   - quess
      aggs        - calculated aggregations
      _ids        - cached _id's of the uploaded data
   }
   */
  options: opts,

  /**
   * Stats DataProvider.readTestingData()
   * loads data from the json file
   *
   * @returns {Object} promise with loaded/parsed data as a param
   */
  readTestingData: function () {

    init_();

    return fs.readFileAsync( file_ )
      .then( JSON.parse )
      .then( function( data ) {
        opts.data = data;
        opts.dataCount = data.length;
        return data;
      })
      .catch( SyntaxError, function( e ) {
        e.fileName = file_;
        throw e;
      });
  },

/**
   * Stats DataProvider.importTestingData()
   * imports data from the production ES cluster, caches it to the json file
   *
   * @returns {Object} promise with loaded/parsed data as a param
   */
  importTestingData: function () {

    init_();

    var countries2 = ['US','IN','PK','GB','EU'],
      devices = ['iPad','iPhone','GT-S7582','Nexus 5','Nokia 203'],
      oses = ['iOS 9.1','Android 4.2.2','Android 4.4.4','Android','Android 4.4.2'],
      lm_rtt_t = { range: { lm_rtt: { 'gt': 4000 } } },
      countries2_t = { terms: { 'geoip.country_code2': countries2 } },
      devices_t = { terms: { 'device': devices } },
      oses_t = { terms: { 'os': oses } },
      s = 40;

    var body = [
      {}, { size: s, query: { bool: { must: [lm_rtt_t,devices_t,oses_t,{ term: { 'geoip.country_code2': countries2[0] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,devices_t,oses_t,{ term: { 'geoip.country_code2': countries2[1] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,devices_t,oses_t,{ term: { 'geoip.country_code2': countries2[2] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,devices_t,oses_t,{ term: { 'geoip.country_code2': countries2[3] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,devices_t,oses_t,{ term: { 'geoip.country_code2': countries2[4] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,oses_t,{ term: { 'device': devices[0] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,oses_t,{ term: { 'device': devices[1] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,oses_t,{ term: { 'device': devices[2] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,oses_t,{ term: { 'device': devices[3] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,oses_t,{ term: { 'device': devices[4] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,devices_t,{ term: { 'os': oses[0] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,devices_t,{ term: { 'os': oses[1] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,devices_t,{ term: { 'os': oses[2] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,devices_t,{ term: { 'os': oses[3] } }] } } },
      {}, { size: s, query: { bool: { must: [lm_rtt_t,countries2_t,devices_t,{ term: { 'os': oses[4] } }] } } }
    ];

    client_i_ = new elastic.Client({
      host: config.api.stats.elastic_import,
      requestTimeout: 60000,
      log: [{
        type: 'stdio',
        levels: [ 'error', 'warning' ]
      }]
    });

    return client_i_.msearch({
        index: opts.index,
        size: 1000,
        timeout: 60000,
        type: type_i_,
        body: body
      })
    .then( function( resp ) {

      opts.data = [];
      opts.dataCount = 0;
      opts.aggs = {};

      for ( var i = 0, len = resp.responses.length; i < len; ++i ) {
        var hits = resp.responses[i].hits.hits;
        for ( var i2 = 0, len2 = hits.length; i2 < len2; ++i2 ) {
          opts.data.push( hits[i2] );
        }
      }
      opts.dataCount = opts.data.length;

      // save to a json file before further processing
      return fs.writeFileAsync( file_, JSON.stringify( opts.data, null, 2 ) );
    });
  },

  /**
   * Stats DataProvider.uploadTestingData()
   * upload data to the QA ES cluster
   *
   * @returns {Object} promise to check for success/error
   */
  uploadTestingData: function () {

    var t = opts.from;
    var step = Math.floor( ( opts.to - opts.from ) / opts.dataCount );

    var body = [];
    var aggs = opts.aggs = {
      country: {},
      os: {},
      device: {}
    };
    //  aggs count abstraction
    var agg_ = function( name, item ) {

      var key;
      if ( name === 'country' ) {
        key = item.geoip && item.geoip.country_code2 ? item.geoip.country_code2 : '--';
      } else {
        key = item[name] ? item[name] : '--';
      }

      if ( !aggs[name][key] ) {
        aggs[name][key] = {
          key: key,
          count: 0,
          lm_rtt_avg_ms: 0,
          lm_rtt_min_ms: 1000000,
          lm_rtt_max_ms: 0
        };
      }
      aggs[name][key].count++;
      aggs[name][key].lm_rtt_avg_ms += item.lm_rtt;
      if ( aggs[name][key].lm_rtt_min_ms > item.lm_rtt ) {
        aggs[name][key].lm_rtt_min_ms = item.lm_rtt;
      } else if ( aggs[name][key].lm_rtt_max_ms < item.lm_rtt ) {
        aggs[name][key].lm_rtt_max_ms = item.lm_rtt;
      }
    };

    //  prepare data to upload
    for ( var i = 0; i < opts.dataCount; ++i ) {
      var item = opts.data[i]._source;

      body.push({ index: {} });
      item['@timestamp'] = (new Date(t)).toISOString().slice(0,-5);
      item.domain = config.api.stats.domains.google.name;
      body.push( item );
      t += step;

      //  "manually" collect aggregations for further tests
      agg_( 'os', item );
      agg_( 'device', item );
      agg_( 'country', item );

    }

    //  round aggregations
    for ( var key0 in aggs ) {
      for ( var key1 in aggs[key0] ) {
        var item = aggs[key0][key1];
        item.lm_rtt_avg_ms = Math.round( item.lm_rtt_avg_ms / item.count / 1000 );
        item.lm_rtt_min_ms = Math.round( item.lm_rtt_min_ms / 1000 );
        item.lm_rtt_max_ms = Math.round( item.lm_rtt_max_ms / 1000 );
      }
    }

    // bulk upload itself
    return client_.bulk({
      index: opts.index,
      type: type_,
      refresh: true,
      body: body
    })
    .then( function( resp ) {
      // { took: 177,
      //   errors: false,
      //   items:
      //    [ { create:
      //         { _index: 'logstash-2015.11.10',
      //           _type: 'apache_json',
      //           _id: 'AVD82nywkHRFAn3jA1B-',
      //           _version: 1,
      //           status: 201 } }, .....
      if ( !resp.items ) {
        return;
      }
      opts._ids = _.map( resp.items, function( item ) {
        return item.create._id;
      });
      return opts;
    });

    // return opts;
  },


  /**
   * Stats DataProvider.clearTestingData()
   * remove uploaded data from the QA ES cluster (using cached _id's)
   *
   * @returns {Object} promise to check for success/error
   */
  clearTestingData: function () {

    var body = _.map( opts._ids, function( _id ) {
      return {
        delete: {
          _index: opts.index,
          _type: type_,
          _id: _id
        }
      };
    });

    return client_.bulk({
      timeout: 120000,
      refresh: true,
      body: body
    })
    .then( function( res_ ) {
      opts.data = [];
      opts.dataCount = 0;
      opts.aggs = {};
      opts._ids = [];
      return opts;
    });
  },

  /**
   * Stats DataProvider.killTestingData()
   * remove all uploaded data from the QA ES cluster, not using cached _id's but clear off all records with type === type_
   *
   * @returns {Object} promise to check for success/error
   */
  killTestingData: function () {

    if ( !client_ ) {
      init_();
    }

    return client_.search({
      index: opts.index,
      type: type_,
      size: 10000,
      body: {
        query: {
          match_all: {}
        },
        _source: false
      }
    })
    .then( function( resp ) {

      if ( !resp.hits || !resp.hits.hits ) {
        // console.log( resp );
        return false;
      }

      var body = _.map( resp.hits.hits, function( item ) {
        return {
          delete: {
            _index: opts.index,
            _type: type_,
            _id: item._id
          }
        };
      });

      return client_.bulk({
        timeout: 60000,
        refresh: true,
        body: body
      });
    })
    .then( function() {
      opts.data = [];
      opts.dataCount = 0;
      opts.aggs = {};
      opts._ids = [];
      return opts;
    });
  }

};
