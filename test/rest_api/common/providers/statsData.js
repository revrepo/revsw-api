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
  date_ = require( 'datejs' ),
  elastic = require('elasticsearch'),
  config = require( 'config' ),
  promise = require('bluebird'),
  fs = promise.promisifyAll(require('fs'));


//  ----------------------------------------------------------------------------------------------//


var client_ = false,
  client_timeout_ = 1200000,
  uploadPortionSize_ = 5000,
  uploadConcurrency_ = 3,
  type_ = 'apache_json_testing',
  host_ = config.api.stats.elastic_test,
  domain_ = config.api.stats.domains.google.name,
  file_ = __dirname + '/statsData.json',
  templates_file_ = __dirname + '/statsTemplates.json',
  meta_file_ = __dirname + '/statsMeta.json';

//  ---------------------------------
// creates indices list from the time span, like "logstash-2015.11.14,logstash-2015.11.15,logstash-2015.11.16,logstash-2015.11.17"
// used in functions doing ElasticSearch calls
// from and to both are Unix timestamps
var build_indices_list_ = function ( from, to ) {
  var d_start = new Date( from ),
    day_ms = 24 * 3600000,
    list = 'logstash-' + d_start.getUTCFullYear() + '.' + ('0' + (d_start.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d_start.getUTCDate()).slice(-2);

  to = Math.floor( to / day_ms + 1 ) * day_ms;
  for ( var d = from + day_ms; d < to; d += day_ms ) {
    var d_curr = new Date( d );
    list += ',logstash-' + d_curr.getUTCFullYear() + '.' + ('0' + (d_curr.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d_curr.getUTCDate()).slice(-2);
  }
  return list;
};

//  ---------------------------------
var date_2_timestamp_ = function ( date ) {
  if ( !date ) {
    return date;
  }
  if (Date.parse(date)) {
    return (Date.parse(date).getTime());
  }
  if (parseInt(date)) {
    return parseInt(date);
  }
  throw new Error( 'illegal date/timestamp value' );
};

//  ---------------------------------
//  lm_rtt aggregations count abstraction
var count_lm_rtt_agg_ = function( aggs, name, item ) {

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

//  ---------------------------------
//  GBT/Traffic aggregations count abstraction
var count_gbt_agg_ = function( aggs, name, item ) {

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
      sent_bytes: 0,
      received_bytes: 0
    };
  }
  aggs[name][key].count++;
  aggs[name][key].sent_bytes += item.s_bytes;
  aggs[name][key].received_bytes += item.r_bytes;
};

// var agg_ = {
//   indicesList: ''
//   from: 0,
//   to: 0,
//   lm_rtt_aggs: {},
//   gbt_aggs: {}
// };

//  ---------------------------------
var init_lm_rtt_aggs_ = function() {
  return {
    country: {},
    os: {},
    device: {}
  };
};
var init_gbt_aggs_ = function() {
  return {
    country: {},
    os: {},
    device: {}
  };
};

//  ---------------------------------
var count_aggs_ = function( opts ) {

  opts.aggs = [];
  //  first aggregation is whole interval
  opts.aggs.push({
    indicesList: opts.indicesList,
    from: opts.from,
    to: opts.to,
    lm_rtt_aggs: init_lm_rtt_aggs_(),
    gbt_aggs: init_gbt_aggs_()
  });

  var span = Math.round( ( opts.to - opts.from ) / opts.spansNum );
  var curr = opts.from;

  for ( var i = 0; i < opts.spansNum; ++i ) {
    opts.aggs.push({
      indicesList: build_indices_list_( curr, curr + span ),
      from: curr,
      to: ( curr + span ),
      lm_rtt_aggs: init_lm_rtt_aggs_(),
      gbt_aggs: init_gbt_aggs_()
    });
    curr += span;
  }

  for ( i = 0; i < opts.dataCount; ++i ) {
    var item = opts.data[i]._source,
      span_i = Math.floor( ( opts.data[i].t - opts.from ) / span ) + 1,
      agg = opts.aggs[span_i];

    //  "manually" collect aggregations for further tests
    count_lm_rtt_agg_( agg.lm_rtt_aggs, 'os', item );
    count_lm_rtt_agg_( agg.lm_rtt_aggs, 'device', item );
    count_lm_rtt_agg_( agg.lm_rtt_aggs, 'country', item );
    count_gbt_agg_( agg.gbt_aggs, 'os', item );
    count_gbt_agg_( agg.gbt_aggs, 'device', item );
    count_gbt_agg_( agg.gbt_aggs, 'country', item );

    count_lm_rtt_agg_( opts.aggs[0].lm_rtt_aggs, 'os', item );
    count_lm_rtt_agg_( opts.aggs[0].lm_rtt_aggs, 'device', item );
    count_lm_rtt_agg_( opts.aggs[0].lm_rtt_aggs, 'country', item );
    count_gbt_agg_( opts.aggs[0].gbt_aggs, 'os', item );
    count_gbt_agg_( opts.aggs[0].gbt_aggs, 'device', item );
    count_gbt_agg_( opts.aggs[0].gbt_aggs, 'country', item );
  }

  //  round lm_rtt aggregations
  for ( var a = 0, len = opts.aggs.length; a < len; ++a ) {
    agg = opts.aggs[a];
    for ( var key0 in agg.lm_rtt_aggs ) {
      for ( var key1 in agg.lm_rtt_aggs[key0] ) {
        item = agg.lm_rtt_aggs[key0][key1];
        item.lm_rtt_avg_ms = Math.round( item.lm_rtt_avg_ms / item.count / 1000 );
        item.lm_rtt_min_ms = Math.round( item.lm_rtt_min_ms / 1000 );
        item.lm_rtt_max_ms = Math.round( item.lm_rtt_max_ms / 1000 );
      }
    }
  }
};

//  DataProvider ---------------------------------------------------------------------------------//



/**
 * Stats DataProvider.constructor
 * Stats DataProvider.options
 *
 * {Object} containing data for testing and comparison
 {
    indicesList - list of indices generated for the given timespan
    from        - start interval timestamp
    to          - end interval timestamp
    data        - loaded data
    dataCount   - mainly equal to data.length, but may contain length of the data stored in the ES cluster(after meta loading)
    spansNum    - whole range splitted to the number of smaller spans
    aggs        - array of pre-counted aggregations
    template    -
    keys        -
 }
 */
var DataProvider = module.exports = function( from, to ) {

  this.options = {
    indicesList: '',
    from: 0,
    to: 0,
    data: [],
    dataCount: 0,
    spansNum: 8,
    aggs: [],
    template: {},
    keys: {
      status_code: ['200','304','301','206','404','302','416','504','400','503'],
      cache_code: ['HIT','MISS'],
      request_status: ['OK','ERROR'],
      protocol: ['HTTP','HTTPS'],
      http_method: ['GET','HEAD','POST','PUT','DELETE','PATCH'],
      quic: ['QUIC','HTTP'],
      country: ['US','GB','FR','IN','CN','EU'],
      agents: []
    }
  };

  //  working timestamp interval, converted and rounded 2 5 min
  from = Math.floor( date_2_timestamp_( from ) / 300000 ) * 300000;
  to = Math.floor( date_2_timestamp_( to ) / 300000 ) * 300000;
  //  default is today's first half
  this.options.from = from || ( Math.floor( Date.now() / ( 3600000 * 24 ) ) * 3600000 * 24 );
  this.options.to = to || ( this.options.from + 3600000 * 12 );

  if ( this.options.to < this.options.from ) {
    var t_ = this.options.to;
    this.options.to = this.options.from;
    this.options.from = t_;
  }
  this.options.indicesList = build_indices_list_( this.options.from, this.options.to );

  //  read templates syncronously
  var tmpl = fs.readFileSync( templates_file_ );
  tmpl = JSON.parse( tmpl );
  this.options.template = tmpl.template;
  this.options.template.domain = domain_;
  this.options.keys.agents = tmpl.agent;

  //  init client
  client_ = new elastic.Client({
    host: host_,
    requestTimeout: client_timeout_,
    // log: 'trace'
    log: [{
      type: 'stdio',
      levels: [ 'error', 'warning' ]
    }]
  });
};

/**
 * Stats DataProvider.clear()
 * clear loaded/generated data
 */
DataProvider.prototype.clear = function () {
  this.options.data = [];
  this.options.dataCount = 0;
  this.options.aggs = [];
};

/**
 * Stats DataProvider.readTestingData()
 * loads data from the json file
 *
 * @returns {Object} promise with loaded/parsed data as a param
 */
DataProvider.prototype.readTestingData = function () {

  var self = this,
    meta_loaded = false;

  return fs.readFileAsync( meta_file_ )
    .then( JSON.parse )
    .then( function( data ) {
      _.extend( self.options, data );
      self.options.data = [];
      meta_loaded = true;
      return self;
    })
    .then( function() {
      return fs.accessAsync( file_, fs.R_OK );
    })
    .then( function() {
      return fs.readFileAsync( file_ );
    })
    .then( JSON.parse )
    .then( function( data ) {
      self.options.data = data;
      self.options.dataCount = data.length;
      return self;
    })
    .catch( SyntaxError, function( e ) {
      e.fileName = file_;
      throw e;
    })
    .catch( function( e ) {
      if ( !meta_loaded ) {
        throw e;
      }
    });
};

/**
 * Stats DataProvider.generateTestingData()
 * ..., caches it to the json file
 *
 */
DataProvider.prototype.generateTestingData = function ( save_data ) {

  var keys = this.options.keys,
    tmpl = this.options.template,
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    len7 = keys.agents.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7,
    t = this.options.from,
    span = Math.floor( ( this.options.to - this.options.from ) / total );

  this.clear();
  //  generate
  for ( var i0 = 0; i0 < len0; ++i0 ) {
    tmpl.response = keys.status_code[i0];
    for ( var i1 = 0; i1 < len1; ++i1 ) {
      tmpl.cache = keys.cache_code[i1];
      for ( var i2 = 0; i2 < len2; ++i2 ) {
        tmpl.conn_status = keys.request_status[i2];
        for ( var i3 = 0; i3 < len3; ++i3 ) {
          tmpl.ipport = keys.protocol[i3] === 'HTTP' ? '80' : '443';
          for ( var i4 = 0; i4 < len4; ++i4 ) {
            tmpl.method = keys.http_method[i4];
            for ( var i5 = 0; i5 < len5; ++i5 ) {
              tmpl.quic = keys.quic[i5] === 'QUIC' ? 'QUIC' : '-';
              for ( var i6 = 0; i6 < len6; ++i6 ) {
                tmpl.geoip.country_code2 = keys.country[i6];
                for ( var i7 = 0; i7 < len7; ++i7 ) {

                  tmpl.os = keys.agents[i7].os;
                  tmpl.agent = keys.agents[i7].agent;
                  tmpl.device = keys.agents[i7].device;

                  tmpl.s_bytes = Math.floor(Math.random() * 4500) + 500;
                  tmpl.r_bytes = Math.floor(Math.random() * 900) + 100;
                  tmpl.lm_rtt = Math.floor(Math.random() * 500000) + 4000;

                  tmpl['@timestamp'] = (new Date(t)).toISOString().slice(0,-1);

                  var r_ = _.clone( tmpl );
                  r_.geoip = _.clone( tmpl.geoip );
                  this.options.data.push({ _source: r_, t: t });

                  t += span;
                }
              }
            }
          }
        }
      }
    }
  }
  this.options.dataCount = this.options.data.length;
  count_aggs_( this.options );

  // save to a json file before further processing
  fs.writeFileAsync( meta_file_, JSON.stringify( _.omit( this.options, 'data', 'template', 'keys' ), null, 2 ) );
  if ( save_data ) {
    fs.writeFileAsync( file_, JSON.stringify( this.options.data, null, 2 ) );
  }
};

/**
 * Stats DataProvider.generateTopObjectsTests()
 *
 */
DataProvider.prototype.generateTopObjectsTests = function () {

  var keys = this.options.keys,
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    len7 = keys.agents.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7;

  var tests = [];
  for ( var i = 0; i < 256; ++i ) {
    var keys_ = [],
      count = total;

    if ( i&1 ) {
      keys_.push( 'status_code' );
      count /= len0;
    }
    if ( i&2 ) {
      keys_.push( 'cache_code' );
      count /= len1;
    }
    if ( i&4 ) {
      keys_.push( 'request_status' );
      count /= len2;
    }
    if ( i&8 ) {
      keys_.push( 'protocol' );
      count /= len3;
    }
    if ( i&16 ) {
      keys_.push( 'http_method' );
      count /= len4;
    }
    if ( i&32 ) {
      keys_.push( 'quic' );
      count /= len5;
    }
    if ( i&64 ) {
      keys_.push( 'country' );
      count /= len6;
    }
    if ( i&128 ) {
      keys_.push( 'agents' );
      count /= len7;
    }

    tests.push({
      keys: keys_,
      count: count
    });
  }

  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = {};
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k],
        val = keys[key][ Math.floor( keys[key].length * Math.random() ) ];

      if ( key === 'agents' ) {
        test.query.os = val.os;
        test.query.device = val.device;
      } else {
        test.query[key] = val;
      }
    }
  }

  return _.map( tests, function( test ) {
    return { query: test.query, count: test.count };
  });
};

/**
 * Stats DataProvider.generateTopTests()
 *
 */
DataProvider.prototype.generateTopTests = function () {

  var keys = this.options.keys,
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    len7 = keys.agents.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7;

  var oses = {};
  var len8 = 0;
  var devices = {};
  var len9 = 0;
  for ( var i = 0, lenka = keys.agents.length; i < lenka; ++i ) {
      var item = keys.agents[i];
      if ( !oses[item.os] ) {
        oses[item.os] = 0;
        ++len8;
      }
      ++oses[item.os];
      if ( !devices[item.device] ) {
        devices[item.device] = 0;
        ++len9;
      }
      ++devices[item.device];
  }
  _.each( oses, function( val, key ) {
    oses[key] = val * total / len7/*agents*/;
  });
  _.each( devices, function( val, key ) {
    devices[key] = val * total / len7/*agents*/;
  });

  return [
    {
      name: 'referer',
      query: { report_type: 'referer' },
      total_hits: total,
      data_points_count: 0,
      count: false
    },
    {
      name: 'referer-country',
      query: { report_type: 'referer', country: 'IN' },
      total_hits: total / len6/*country.length*/,
      data_points_count: 0,
      count: false
    },
    {
      name: 'status_code',
      query: { report_type: 'status_code' },
      total_hits: total,
      data_points_count: len0,
      count: function( key ) { return total / len0; }
    },
    {
      name: 'status_code-country',
      query: { report_type: 'status_code', country: 'US' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len0,
      count: function( key ) { return total / len6 / len0; }
    },
    {
      name: 'cache_status',
      query: { report_type: 'cache_status' },
      total_hits: total,
      data_points_count: len1,
      count: function( key ) { return total / len1; }
    },
    {
      name: 'cache_status-country',
      query: { report_type: 'cache_status', country: 'CN' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len1,
      count: function( key ) { return total / len6 / len1; }
    },
    {
      name: 'content_type',
      query: { report_type: 'content_type' },
      total_hits: total,
      data_points_count: 1,
      count: false
    },
    {
      name: 'content_type-country',
      query: { report_type: 'content_type', country: 'IN' },
      total_hits: total / len6/*country.length*/,
      data_points_count: 1,
      count: false
    },
    {
      name: 'request_status',
      query: { report_type: 'request_status' },
      total_hits: total,
      data_points_count: len2,
      count: function( key ) { return total / len2; }
    },
    {
      name: 'request_status-country',
      query: { report_type: 'request_status', country: 'GB' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len2,
      count: function( key ) { return total / len6 / len2; }
    },
    {
      name: 'protocol',
      query: { report_type: 'protocol' },
      total_hits: total,
      data_points_count: len3,
      count: function( key ) { return total / len3; }
    },
    {
      name: 'protocol-country',
      query: { report_type: 'protocol', country: 'FR' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len3,
      count: function( key ) { return total / len6 / len3; }
    },
    {
      name: 'http_method',
      query: { report_type: 'http_method' },
      total_hits: total,
      data_points_count: len4,
      count: function( key ) { return total / len4; }
    },
    {
      name: 'http_method-country',
      query: { report_type: 'http_method', country: 'EU' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len4,
      count: function( key ) { return total / len6 / len4; }
    },
    {
      name: 'content_encoding',
      query: { report_type: 'content_encoding' },
      total_hits: total,
      data_points_count: 0,
      count: false
    },
    {
      name: 'content_encoding-country',
      query: { report_type: 'content_encoding', country: 'IN' },
      total_hits: total / len6/*country.length*/,
      data_points_count: 0,
      count: false
    },
    {
      name: 'quic',
      query: { report_type: 'QUIC' },
      total_hits: total,
      data_points_count: len5,
      count: function( key ) { return total / len5; }
    },
    {
      name: 'quic-country',
      query: { report_type: 'QUIC', country: 'GB' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len5,
      count: function( key ) { return total / len6 / len5; }
    },
    {
      name: 'country',
      query: { report_type: 'country' },
      total_hits: total,
      data_points_count: len6,
      count: function( key ) { return total / len6; }
    },
    {
      name: 'country-country',
      query: { report_type: 'country', country: 'US' },
      total_hits: total / len6/*country.length*/,
      data_points_count: 1,
      count: function( key ) { return total / len6; }
    },
    {
      name: 'os',
      query: { report_type: 'os' },
      total_hits: total,
      data_points_count: len8,
      count: function( key ) { return oses[key]; }
    },
    {
      name: 'os-country',
      query: { report_type: 'os', country: 'US' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len8,
      count: function( key ) { return oses[key] / len6; }
    },
    {
      name: 'device',
      query: { report_type: 'device' },
      total_hits: total,
      data_points_count: len9,
      count: function( key ) { return devices[key]; }
    },
    {
      name: 'device-country',
      query: { report_type: 'device', country: 'IN' },
      total_hits: total / len6/*country.length*/,
      data_points_count: len9,
      count: function( key ) { return devices[key] / len6; }
    }
  ];
};

/**
 * Stats DataProvider.uploadTestingData()
 * upload data to the QA ES cluster
 *
 * @returns {Object} promise to check for success/error
 */
DataProvider.prototype.uploadTestingData = function () {

  var requests = [];
  var curr = 0;

  while ( curr < this.options.dataCount ) {

    var end = curr + uploadPortionSize_;
    if ( end > this.options.dataCount ) {
      end = this.options.dataCount;
    }

    var body = [];
    while ( curr < end ) {
      var item = this.options.data[curr];
      body.push({ index: { _index: build_indices_list_( item.t, item.t ) } });
      body.push( item._source );
      ++curr;
    }

    requests.push({
      type: type_,
      body: body
    });
  }

  return promise.map( requests, function( req ) {
    return client_.bulk( req )
      .then( function( resp ) {
        console.log( '      # portion upload done, items: ' + resp.items.length + ', errors: ' + resp.errors );
      });
  }, { concurrency: uploadConcurrency_ } );
  // .then( function( resp ) {
  //   // { took: 177,
  //   //   errors: false,
  //   //   items:
  //   //    [ { create:
  //   //         { _index: 'logstash-2015.11.10',
  //   //           _type: 'apache_json',
  //   //           _id: 'AVD82nywkHRFAn3jA1B-',
  //   //           _version: 1,
  //   //           status: 201 } }, .....
  //   if ( !resp.items ) {
  //     return;
  //   }
  //   this.options._ids = _.map( resp.items, function( item ) {
  //     return item.create._id;
  //   });
  //   return this.options;
  // });
};

/**
 * Stats DataProvider.killTestingData()
 * remove all uploaded data from the QA ES cluster, not using cached _id's but clear off all records with type === type_
 *
 * @returns {Object} promise to check for success/error
 */
DataProvider.prototype.removeTestingData = function () {

  var self = this;
  var hits_num = 0;

  return client_.search({
    index: self.options.indicesList,
    type: type_,
    size: 300000,
    body: {
      query: {
        match_all: {}
      },
      _source: false
    }
  })
  .then( function( resp ) {

    //  response:
    // { took: 6874,
    //   timed_out: false,
    //   _shards: { total: 5, successful: 5, failed: 0 },
    //   hits: { total: 220921, max_score: 1, hits: [ ..................... ] } }
    //  hits[0]:
    // { _index: 'logstash-2015.11.15',
    //   _type: 'apache_json_testing',
    //   _id: 'AVEOT1CTkHRFAn3jGiD2',
    //   _score: 1 }

    if ( !resp.hits || !resp.hits.hits || !resp.hits.hits.length ) {
      return false;
    }

    var requests = [];
    var curr = 0;

    hits_num = resp.hits.hits.length;
    while ( curr < hits_num ) {

      var end = curr + uploadPortionSize_;
      if ( end > hits_num ) {
        end = hits_num;
      }

      var body = [];
      while ( curr < end ) {
        body.push({
          delete: _.omit( resp.hits.hits[curr], '_score' )
        });
        ++curr;
      }

      //  push one bulk request to remove uploadPortionSize_ records
      requests.push({
        type: type_,
        body: body
      });

    }

    return promise.map( requests, function( req ) {
      return client_.bulk( req )
        .then( function( resp ) {
          console.log( '      # portion removing done' );
        });
    }, { concurrency: uploadConcurrency_ } );

  })
  .then( function() {
    self.clear();
    return hits_num;
  });
};



