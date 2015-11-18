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
  client_timeout_ = 600000,
  portionSize_ = 10000, //  upload portion
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
    dataCount   - quess
    spansNum    - whole range splitted to the number of smaller spans
    aggs        - array of pre-counted aggregations
 }
 */
var DataProvider = function( from, to ) {

  this.options = {
    indicesList: '',
    from: 0,
    to: 0,
    data: [],
    dataCount: 0,
    spansNum: 8,
    aggs: []
  };

  //  working timestamp interval, default is yesterday's first half
  from = date_2_timestamp_( from );
  to = date_2_timestamp_( to );
  this.options.from = from || ( Math.floor( Date.now() / ( 3600000 * 24 ) - 1 ) * 3600000 * 24 );
  this.options.to = to || ( this.options.from + 3600000 * 12 );
  if ( this.options.to < this.options.from ) {
    var t_ = this.options.to;
    this.options.to = this.options.from;
    this.options.from = t_;
  }
  this.options.indicesList = build_indices_list_( this.options.from, this.options.to );

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
      self.options = data;
      self.options.data = [];
      self.options.dataCount = 0;
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
 * @returns {Object} promise with loaded/parsed data as a param
 */
DataProvider.prototype.generateTestingData = function ( save_data ) {

  var status_codes = ['200','304','301','206','404','302','416','504','400','503'],
    cache_codes = ['HIT','MISS'],
    request_statuses = ['OK','ERROR'],
    protocols = ['80','443'],
    http_methods = ['GET','HEAD','POST','PUT','DELETE','PATCH'],
    quics = ['QUIC','-'],
    countries = ['US','GB','FR','IN','CN','EU'],
    dev_oses = [],
    template,
    self = this;

  return fs.readFileAsync( templates_file_ )
  .then( JSON.parse )
  .then( function( data ) {

    template = data.template;
    template.domain = domain_;

    dev_oses = data.agent;
    var len0 = status_codes.length,
      len1 = cache_codes.length,
      len2 = request_statuses.length,
      len3 = protocols.length,
      len4 = http_methods.length,
      len5 = quics.length,
      len6 = countries.length,
      len7 = dev_oses.length,
      total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7,
      t = self.options.from,
      span = Math.floor( ( self.options.to - self.options.from ) / total );

    self.clear();
    //  generate
    for ( var i0 = 0; i0 < len0; ++i0 ) {
      template.response = status_codes[i0];
      for ( var i1 = 0; i1 < len1; ++i1 ) {
        template.cache = cache_codes[i1];
        for ( var i2 = 0; i2 < len2; ++i2 ) {
          template.conn_status = request_statuses[i2];
          for ( var i3 = 0; i3 < len3; ++i3 ) {
            template.ipport = protocols[i3];
            for ( var i4 = 0; i4 < len4; ++i4 ) {
              template.method = http_methods[i4];
              for ( var i5 = 0; i5 < len5; ++i5 ) {
                template.quic = quics[i5];
                for ( var i6 = 0; i6 < len6; ++i6 ) {
                  template.geoip.country_code2 = countries[i6];
                  for ( var i7 = 0; i7 < len7; ++i7 ) {

                    template.os = dev_oses[i7].os;
                    template.agent = dev_oses[i7].agent;
                    template.device = dev_oses[i7].device;

                    template.s_bytes = Math.floor(Math.random() * 4500) + 500;
                    template.r_bytes = Math.floor(Math.random() * 900) + 100;
                    template.lm_rtt = Math.floor(Math.random() * 500000) + 4000;

                    template['@timestamp'] = (new Date(t)).toISOString().slice(0,-5);

                    var r_ = _.clone( template );
                    r_.geoip = _.clone( template.geoip );
                    self.options.data.push({ _source: r_, t: t });

                    t += span;
                  }
                }
              }
            }
          }
        }
      }
    }
    self.options.dataCount = self.options.data.length;
    count_aggs_( self.options );

    // save to a json file before further processing
    fs.writeFileAsync( meta_file_, JSON.stringify( _.omit( self.options, 'data', 'dataCount' ), null, 2 ) );
    if ( save_data ) {
      fs.writeFileAsync( file_, JSON.stringify( self.options.data, null, 2 ) );
    }
  })
  .catch( SyntaxError, function( e ) {
    e.fileName = templates_file_;
    throw e;
  });

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

    var end = curr + portionSize_;
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

    //  push one bulk request to add portionSize_(10000) records
    requests.push( client_.bulk({
      type: type_,
      // refresh: true,
      body: body
    }) );

  }

  return promise.all( requests );
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

    var len = resp.hits.hits.length;
    var requests = [];
    var curr = 0;

    while ( curr < len ) {

      var end = curr + portionSize_ * 3;
      if ( end > len ) {
        end = len;
      }

      var body = [];
      while ( curr < end ) {
        body.push({
          delete: _.omit( resp.hits.hits[curr], '_score' )
        });
        ++curr;
      }

      //  push one bulk request to remove 3*portionSize_(30000) records
      requests.push( client_.bulk({
        type: type_,
        // refresh: true,
        body: body
      }) );

    }

    return promise.all( requests );
  })
  .then( function() {
    self.clear();
    return self;
  });
};



//  ----------------------------------------------------------------------------------------------//
module.exports = DataProvider;


