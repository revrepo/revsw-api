/* jshint ignore:start */
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
  promise = require('bluebird'),
  config = require( 'config' );

require( 'datejs' );

// var domain_name = config.api.usage_report.domains_name;
// var domain_aliases_ = config.api.usage_report.domain_aliases;
//  ----------------------------------------------------------------------------------------------//

var client_ = false,
  client_url_ = false;

//  ---------------------------------
// creates indices list from the time span,
//  like "logstash-2015.11.14,logstash-2015.11.15,logstash-2015.11.16,logstash-2015.11.17"
// used in functions doing ElasticSearch calls
// from and to both are Unix timestamps
var build_indices_list_ = function ( from, to ) {
  var d_start = new Date( from ),
    day_ms = 24 * 3600000,
    list = 'logstash-' + d_start.getUTCFullYear() + '.' + ('0' + (d_start.getUTCMonth() + 1)).slice(-2) +
      '.' + ('0' + d_start.getUTCDate()).slice(-2);

  to = Math.floor( ( to - 1 ) / day_ms + 1 ) * day_ms;
  for ( var d = from + day_ms; d < to; d += day_ms ) {
    var d_curr = new Date( d );
    list += ',logstash-' + d_curr.getUTCFullYear() + '.' + ('0' + (d_curr.getUTCMonth() + 1)).slice(-2) +
      '.' + ('0' + d_curr.getUTCDate()).slice(-2);
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

//  DataProvider ---------------------------------------------------------------------------------//

/**
 * Stats DataProvider.constructor
 * Stats DataProvider.options
 *
 * {Object} containing data for testing and comparison
 {
    indicesList     - list of indices generated for the given timespan
    from            - start interval timestamp
    to              - end interval timestamp
    data            - generated data
    dataCount       - guess
    keys            - possible values for the generated data
    template        - template record to insert into ESURL
    template_short  - template record to insert into ES
 }
 */
var DataProvider = module.exports = function( from, to ) {

  this.options = {
    indicesList: '',
    from: 0,
    to: 0,
    data: [],
    dataCount: 0,
    keys: {
      status_code: ['200','304','301','206','404','302','416','504','400','503'],
      cache_code: ['HIT','MISS'],
      request_status: ['OK','ERROR'],
      protocol: ['HTTP','HTTPS'],
      http_method: ['GET','HEAD','POST','PUT','DELETE','PATCH'],
      quic: ['QUIC','HTTP'],
      country: ['US','GB','FR','IN','CN'],
      os: ['Android 4.4','Android 5.0','Android 5.1','iOS 8.4','iOS 9.0.2'],
      device: ['iPhone','iPad','Nexus 5','GT-S7582','SM-G530H']
    },
    template: {
      '@timestamp': '',
      '@version': '1',
      domain: config.api.usage_report.domain_name,
      ipport: '80',
      protocol: 'HTTP/1.1',
      clientip: '66.249.93.145',
      duration: 0.147,
      upstream_time: '0.147',
      response: '200',
      request: '/favicon.ico',
      s_bytes: 2000,
      r_bytes: 200,
      method: 'GET',
      conn_status: 'OK',
      KA: 24,
      FBT_mu: 145921,
      cache: 'MISS',
      cache_age: '0',
      cache_ttl: '-',
      agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12H321',
      cont_type: 'image/x-icon',
      quic: '-',
      lm_rtt: 0,
      type: 'apache_json',
      host: 'IAD02-BP01.REVSW.NET',
      geoip: {
        country_code2: ''
      },
      os: '',
      device: ''
    },
    template_short: {
      '@timestamp': '',
      '@version': '1',
      domain: config.api.usage_report.domain_name,
      ipport: '80',
      duration: 0.147,
      upstream_time: '0.147',
      response: '200',
      s_bytes: 2000,
      r_bytes: 200,
      method: 'GET',
      conn_status: 'OK',
      KA: 24,
      FBT_mu: 145921,
      cache: 'MISS',
      quic: '-',
      host: 'IAD02-BP01.REVSW.NET',
      geoip: {
        country_code2: ''
      },
      os: '',
      device: ''
    },
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
};


//  utils ----------------------------------------------------------------------------------------//

/**
 * Stats DataProvider.clear()
 * clear loaded/generated data
 */
DataProvider.prototype.clear = function () {
  this.options.data = [];
  this.options.dataCount = 0;
};

/**
 * Stats DataProvider.setSpan()
 * set time span
 */
DataProvider.prototype.setSpan = function ( from, to ) {

  //  working timestamp interval, converted and rounded 2 5 min
  this.options.from = Math.floor( date_2_timestamp_( from ) / 300000 ) * 300000;
  this.options.to = Math.floor( date_2_timestamp_( to ) / 300000 ) * 300000;

  if ( this.options.to < this.options.from ) {
    var t_ = this.options.to;
    this.options.to = this.options.from;
    this.options.from = t_;
  }
  this.options.indicesList = build_indices_list_( this.options.from, this.options.to );
};

/**
 * Stats DataProvider.todayAMSpan()
 * this day first half span
 */
DataProvider.prototype.todayAMSpan = function () {
  var day_ms = 3600000 * 24;
  this.options.from = Math.floor( Date.now() / day_ms ) * day_ms;
  this.options.to = this.options.from + ( day_ms / 2 );
  this.options.indicesList = build_indices_list_( this.options.from, this.options.to );
};

/**
 * Stats DataProvider.yesterdayPMSpan()
 * yesterday's second half span
 */
DataProvider.prototype.yesterdayPMSpan = function () {
  var day_ms = 3600000 * 24;
  this.options.to = Math.floor( Date.now() / day_ms ) * day_ms;
  this.options.from = this.options.to - ( day_ms / 2 );
  this.options.indicesList = build_indices_list_( this.options.from, this.options.to - 1/**/ );
};

/**
 * Stats DataProvider.autoSpan()
 * invoke yesterdayPMSpan before noon and todayAMSpan after noon
 */
DataProvider.prototype.autoSpan = function () {
  if ( ( Date.now() % ( 3600000 * 24 ) ) <= ( 3600000 * 12 ) ) {
    this.yesterdayPMSpan();
  } else {
    this.todayAMSpan();
  }
};

/**
 * Stats DataProvider.countEstimations()
 * pre-count total values for traffic and hits
 */
DataProvider.prototype.countEstimations = function () {
  var est = { total_hits: 1 };
  _.forEach( this.options.keys, function( val, key ) {
    est.total_hits *= val.length;
  });
  est.hits = {};
  _.forEach( this.options.keys, function( val, key ) {
    est.hits[key] = est.total_hits / val.length;
  });
  est.received_bytes = this.options.template.r_bytes * est.total_hits;
  est.sent_bytes = this.options.template.s_bytes * est.total_hits;
  return est;
};


//  data generators ------------------------------------------------------------------------------//


//  utility function to init and return ES client, ES or ESURL depending on the parameter ('es'/'esurl')
var get_client_ = function( which_one ) {

  if ( which_one !== 'es' && which_one !== 'esurl' ) {
    throw new Error( 'DataProvider, get_client_, invalid parameter value: ' + which_one );
  }

  if ( which_one === 'esurl' ) {

    if ( !client_url_ ) {
      //  init client
      client_url_ = new elastic.Client({
        host: config.api.stats.elastic_url,
        requestTimeout: config.api.stats.client_timeout,
        log: [{
          type: 'stdio',
          levels: [ 'error', 'warning' ]
        }]
      });
    }
    return client_url_;
  }

  if ( !client_ ) {
    //  init client
    client_ = new elastic.Client({
      host: config.api.stats.elastic,
      requestTimeout: config.api.stats.client_timeout,
      log: [{
        type: 'stdio',
        levels: [ 'error', 'warning' ]
      }]
    });
  }
  return client_;
};


/**
 * Stats DataProvider.generateTestingData()
 *
 * @parameter {String} 'es'/'esurl' to define what cluster to use
 */
DataProvider.prototype.generateTestingData = function ( which_one ) {

  if ( which_one !== 'es' && which_one !== 'esurl' ) {
    throw new Error( 'DataProvider.generateTestingData, invalid parameter value: ' + which_one );
  }

  var keys = this.options.keys,
    tmpl = ( which_one === 'es' ? this.options.template_short : this.options.template ),
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    len7 = keys.os.length,
    len8 = keys.device.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7 * len8,
    t = this.options.from,
    span = ( this.options.to - this.options.from ) / total,
    aliases = config.api.usage_report.domain_aliases || [];

  aliases.push( config.api.usage_report.domain_name );
  var aliases_num = aliases.length,
    ai = 0;

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
                  tmpl.os = keys.os[i7];
                  for ( var i8 = 0; i8 < len8; ++i8 ) {

                    tmpl.device = keys.device[i8];
                    tmpl['@timestamp'] = new Date(Math.round(t)).toISOString().slice(0,-1);
                    if ( which_one === 'esurl' ) {
                      tmpl.lm_rtt = ( this.options.dataCount % 3 ) * 10000 + 10000;  //  min 10000 avg 20000 max 30000
                    }
                    ++this.options.dataCount;

                    var r_ = _.clone( tmpl );
                    r_.geoip = _.clone( tmpl.geoip );
                    // r_.domain = aliases[Math.floor( Math.random() * aliases_num )];
                    r_.domain = aliases[ ai++ % aliases_num ];

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
  }
};

/**
 * Stats DataProvider.generateDomainsTestingData()
 *
 * @param {String} 'es'/'esurl' to define what cluster to use
 * @param {Array[String]} list of domain names
 * @param {int} number of records to store for every domain
 */
DataProvider.prototype.generateDomainsTestingData = function ( which_one, domains, hits ) {

  if ( which_one !== 'es' && which_one !== 'esurl' ) {
    throw new Error( 'DataProvider.generateDomainsTestingData, invalid parameter value: ' + which_one );
  }

  var tmpl = ( which_one === 'es' ? this.options.template_short : this.options.template ),
    t = this.options.from,
    total = domains.length * hits,
    span = ( this.options.to - this.options.from ) / total;

  this.clear();

  //  generate
  var self = this;
  domains.forEach( function( domain ) {

    var r_ = _.clone( tmpl );
    r_.geoip = _.clone( tmpl.geoip );
    r_.domain = domain;

    for ( var i = 0; i < hits; ++i ) {
      r_['@timestamp'] = new Date(Math.round(t)).toISOString().slice(0,-1);

      self.options.data.push({ _source: r_, t: t });
      ++self.options.dataCount;
      t += span;
    }

  });
};

/**
 * Stats DataProvider.uploadTestingData()
 * upload data to the QA ES cluster
 *
 * @parameter {string} 'es'/'esurl' to define what cluster to use
 * @parameter {string} index type, optional, default is config.api.stats.type
 * @parameter {function} function to log out, optional
 * @return {Object} promise to check for success/error
 */
DataProvider.prototype.uploadTestingData = function ( which_one, type, logger ) {

  type = type || config.api.stats.type;
  logger = logger || function() {};
  var client = get_client_( which_one );
  var requests = [];
  var curr = 0;

  while ( curr < this.options.dataCount ) {

    var end = curr + config.api.stats.upload_portion_size;
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
      type: type,
      body: body
    });
  }

  return promise.map( requests, function( req ) {
    return client.bulk( req )
      .then( function( resp ) {
        logger( 'portion upload done, items: ' + resp.items.length + ', errors: ' + resp.errors );
      });
  }, { concurrency: config.api.stats.upload_concurrency } );
};

/**
 * Stats DataProvider.waitForESUploaded()
 * wait for the records stored in the given ES cluster reached appointed amount
 *
 * @parameter {string} 'es'/'esurl' to define what cluster to use
 * @parameter {string} index type, optional, default is config.api.stats.type
 * @parameter {int} amount of records to reach
 * @parameter {int} attempts to retrieve data from the cluster
 * @parameter {function} function to log out, optional
 * @return {Object} promise to check for success/error
 */
DataProvider.prototype.waitForESUploaded = function( which_one, type, goal, attempts, logger ) {

  type = type || config.api.stats.type;
  attempts = attempts || 16;
  logger = logger || function() {};

  var delay = 5000; // ms
  var idx = this.options.indicesList;

  //  async loop inside IIFE
  return ( function loop( count ) {
    if ( count ) {
      return get_client_( which_one ).count({
          index: idx,
          type: type,
          ignoreUnavailable: true,
        })
        .then( function( data ) {
          logger('counted ' + data.count + ' messages currently stored in ' + which_one.toUpperCase() + ' cluster');
          if ( data.count === goal ) {
            return promise.resolve( true );
          } else {
            logger('the goal ' + goal + ' is not achieved, wait another ' + delay + 'ms for the indices to be refreshed');
            return promise.delay(delay)
              .then( function() {
                return loop( --count );
              });
          }
        });
    }
  })( attempts )
    .then(function( res ) {
      if ( !res ) {
        throw new Error( 'messsages amount stored in the ES cluster still not equal to sent amount' );
      }
    });
},

/**
 * Stats DataProvider.removeTestingData()
 * remove all uploaded data from the QA ES cluster
 *
 * @parameter {string} 'es'/'esurl' to define what cluster to use
 * @parameter {string} index type, optional, default is config.api.stats.type
 * @parameter {function} function to log out, optional
 * @returns {Object} promise to check for success/error
 */
DataProvider.prototype.removeTestingData = function ( which_one, type, logger ) {

  type = type || config.api.stats.type;
  logger = logger || function() {};

  var client = get_client_( which_one );
  var self = this;
  var hits_num = 0;

  return client.search({
    index: self.options.indicesList,
    ignoreUnavailable: true,
    type: type,
    size: 500000,
    body: { _source: false }
  })
  .then( function( resp ) {

    //  response:
    // { took: 6874,
    //   timed_out: false,
    //   _shards: { total: 5, successful: 5, failed: 0 },
    //   hits: { total: 220921, max_score: 1, hits: [ ..................... ] } }
    //  hits[0]:
    // { _index: 'logstash-2015.11.15',
    //   _type: 'apache_json_testing'|'test-aliases',
    //   _id: 'AVEOT1CTkHRFAn3jGiD2',
    //   _score: 1 }

    if ( !resp.hits || !resp.hits.hits || !resp.hits.hits.length ) {
      logger( which_one.toUpperCase() + ' cluster, no data found' );
      return false;
    }

    var requests = [];
    var curr = 0;

    hits_num = resp.hits.hits.length;
    while ( curr < hits_num ) {

      var end = curr + ( config.api.stats.upload_portion_size * 4 );
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

      //  push one bulk request to remove portion of records
      requests.push({
        type: type,
        body: body
      });

    }

    return promise.map( requests, function( req ) {
      return client.bulk( req )
        .then( function( /*resp*/ ) {
          logger( which_one.toUpperCase() + ' cluster, portion removing done' );
        });
    }, { concurrency: config.api.stats.upload_concurrency } );

  })
  .then( function() {
    self.clear();
    return hits_num;
  });
};


//  test generators ------------------------------------------------------------------------------//

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
    len7 = keys.os.length,
    len8 = keys.device.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7 * len8;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
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
      keys_.push( 'os' );
      count /= len7;
    }
    if ( i&256 ) {
      keys_.push( 'device' );
      count /= len8;
    }

    tests.push({
      keys: keys_,
      count: count
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
      test.query[key] = keys[key][ Math.floor( keys[key].length * Math.random() ) ];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count
    };
  });
};

/**
 * Stats DataProvider.generateTopTests()
 *
 */
DataProvider.prototype.generateTopTests = function () {

  var keys = this.options.keys,
    test_keys = {
      referer: 0,
      content_type: 0,
      content_encoding: 0,
      status_code: keys.status_code.length,
      cache_status: keys.cache_code.length,
      request_status: keys.request_status.length,
      protocol: keys.protocol.length,
      http_method: keys.http_method.length,
      quic: keys.quic.length,
      country: keys.country.length,
      os: keys.os.length,
      device: keys.device.length,
    },
    total = test_keys.status_code * test_keys.cache_status * test_keys.request_status * test_keys.protocol *
      test_keys.http_method * test_keys.quic * test_keys.country * test_keys.os * test_keys.device,
    tests = [];

  _.each( test_keys, function( val, key ) {

    var dpt, dptc, cnt, cntc;
    if ( val ) {
      cnt = total / val;
      cntc = key === 'country' ? total / test_keys.country : total / val / test_keys.country;
      dpt = val;
      dptc = key === 'country' ? 1 : val;
    } else {
      dptc = dpt = key === 'content_type' ? 1 : 0;
      cnt = cntc = 0;
    }

    if ( key === 'quic' ) {
      key = 'QUIC';
    }

    tests.push({
      name: key,
      query: { report_type: key },
      total_hits: total,
      data_points_count: dpt,
      count: cnt
    });
    tests.push({
      name: ( key + ',country' ),
      query: {
        report_type: key,
        country: this.options.keys.country[ Math.floor( Math.random() * test_keys.country ) ]
      },
      total_hits: ( total / test_keys.country ),
      data_points_count: dptc,
      count: cntc
    });

  }, this );

  this.autoSpan();
  for ( var i = 0, len = tests.length; i < len; ++i ) {
    var test = tests[i];
    test.query.from_timestamp = this.options.from;
    test.query.to_timestamp = this.options.to;
  }

  return tests;
};

/**
 * Stats DataProvider.generateLMRTTTests()
 *
 */
DataProvider.prototype.generateLMRTTTests = function () {

  var keys = this.options.keys,
    test_keys = {
      country: keys.country.length,
      os: keys.os.length,
      device: keys.device.length,
    },
    total = test_keys.country * test_keys.os * test_keys.device * keys.status_code.length * keys.cache_code.length *
      keys.request_status.length * keys.protocol.length * keys.http_method.length * keys.quic.length;

  this.autoSpan();
  return _.mapValues({ country: {}, os: {}, device: {} }, function( v_, key ) {
    var test = {
        name: key ,
        query: { report_type: key, from_timestamp: this.options.from, to_timestamp: this.options.to },
        total_hits: total,
        data_points_count: test_keys[key],
        data: {}
      };

    _.each( keys[key], function( item ) {
      test.data[item] = {
        key: item,
        count: (total / test_keys[key] ),
        lm_rtt_avg_ms: 20,
        lm_rtt_min_ms: 10,
        lm_rtt_max_ms: 30
      };
    });
    return test;
  }, this );
};

/**
 * Stats DataProvider.generateGBTTests()
 *
 */
DataProvider.prototype.generateGBTTests = function () {

  var keys = this.options.keys,
    test_keys = {
      country: keys.country.length,
      os: keys.os.length,
      device: keys.device.length,
    },
    total = test_keys.country * test_keys.os * test_keys.device * keys.status_code.length * keys.cache_code.length *
      keys.request_status.length * keys.protocol.length * keys.http_method.length * keys.quic.length;

  this.autoSpan();
  return _.mapValues({ country: {}, os: {}, device: {} }, function( v_, key ) {
    var test = {
        name: key ,
        query: { report_type: key, from_timestamp: this.options.from, to_timestamp: this.options.to },
        total_hits: total,
        data_points_count: test_keys[key],
        data: {}
      };

    _.each( keys[key], function( item ) {
      test.data[item] = {
        key: item,
        count: ( total / test_keys[key] ),
        sent_bytes: ( total / test_keys[key] * this.options.template.s_bytes ),
        received_bytes: ( total / test_keys[key] * this.options.template.r_bytes )
      };
    }, this );
    return test;
  }, this );
};

/**
 * Stats DataProvider.generateTopObjectsTests()
 *
 */
DataProvider.prototype.generateStatsTests = function () {

  var keys = this.options.keys,
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    len7 = keys.os.length,
    len8 = keys.device.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7 * len8;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
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
      keys_.push( 'os' );
      count /= len7;
    }
    if ( i&256 ) {
      keys_.push( 'device' );
      count /= len8;
    }

    tests.push({
      keys: keys_,
      count: count
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
      test.query[key] = keys[key][ Math.floor( keys[key].length * Math.random() ) ];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count,
      sent_bytes: test.count * this.options.template_short.s_bytes,
      received_bytes: test.count * this.options.template_short.r_bytes
    };
  }, this );
};

/**
 * Stats DataProvider.generateImageEngineTests()
 *
 */
DataProvider.prototype.generateImageEngineTests = function () {

  var keys = this.options.keys,
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    len7 = keys.os.length,
    len8 = keys.device.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6 * len7 * len8;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
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
      keys_.push( 'os' );
      count /= len7;
    }
    if ( i&256 ) {
      keys_.push( 'device' );
      count /= len8;
    }
      
    tests.push({
      keys: keys_,
      count: count
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
      test.query[key] = keys[key][ Math.floor( keys[key].length * Math.random() ) ];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count,
      sent_bytes: test.count * this.options.template_short.s_bytes,
      received_bytes: test.count * this.options.template_short.r_bytes
    };
  }, this );
};

/**
 * Stats DataProvider.generateMobileDesktopTests()
 *
 */
DataProvider.prototype.generateMobileDesktopTests = function () {

 var keys = this.options.keys,
    len0 = keys.status_code.length,
    len1 = keys.cache_code.length,
    len2 = keys.request_status.length,
    len3 = keys.protocol.length,
    len4 = keys.http_method.length,
    len5 = keys.quic.length,
    len6 = keys.country.length,
    total = len0 * len1 * len2 * len3 * len4 * len5 * len6;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
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
     
    tests.push({
      keys: keys_,
      count: 120000
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count
    };
  });
};

/**
 * Stats DataProvider.generateFBTHeatmapTests()
 *
 */
DataProvider.prototype.generateFBTHeatmapTests = function () {

   
  var keys = this.options.keys,
    len0 = keys.count,
    total = len0;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
    var keys_ = [],
      count = total;

    if ( i&1 ) {
      keys_.push( 'count' );
      count /= len0;
    }

    tests.push({
      keys: keys_,
      count: 120000
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count
    };
  });
};

/**
 * Stats DataProvider.generateFBTDistributionTests()
 *
 */
DataProvider.prototype.generateFBTDistributionTests = function () {

   var keys = this.options.keys,
    len0 = keys.country.length,
    len1 = keys.os.length,
    len2 = keys.device.length,
    len3 = keys.browser,
    len4 = keys.interval_ms,
    len5 = keys.limit_ms,
    total = len0 * len1 * len2 * len3 * len4 * len5;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
    var keys_ = [],
      count = total;

    if ( i&1 ) {
      keys_.push( 'country' );
      count /= len0;
    }
    if ( i&2 ) {
      keys_.push( 'os' );
      count /= len1;
    }
    if ( i&4 ) {
      keys_.push( 'device' );
      count /= len2;
    }
    if ( i&8 ) {
      keys_.push( 'browser' );
      count /= len3;
    }
    if ( i&16 ) {
      keys_.push( 'interval_ms' );
      count /= len4;
    }
    if ( i&32 ) {
      keys_.push( 'limit_ms' );
      count /= len5;
    }
    
    tests.push({
      keys: keys_,
      count: 120000
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count
    };
  });
};

/**
 * Stats DataProvider.generateFBTAverageTests Tests()
 *
 */
DataProvider.prototype.generateFBTAverageTests = function () {

   var keys = this.options.keys,
    len0 = keys.country.length,
    len1 = keys.os.length,
    len2 = keys.device.length,
    len3 = keys.browser,
    total = len0 * len1 * len2 * len3;

  var tests = [];
  for ( var i = 0; i < 512; ++i ) {
    var keys_ = [],
      count = total;

    if ( i&1 ) {
      keys_.push( 'country' );
      count /= len0;
    }
    if ( i&2 ) {
      keys_.push( 'os' );
      count /= len1;
    }
    if ( i&4 ) {
      keys_.push( 'device' );
      count /= len2;
    }
    if ( i&8 ) {
      keys_.push( 'browser' );
      count /= len3;
    }

    tests.push({
      keys: keys_,
      count: 120000
    });
  }

  this.autoSpan();
  for ( var t = 0, lent = tests.length; t < lent; ++t ) {
    var test = tests[t];
    test.query = { from_timestamp: this.options.from, to_timestamp: this.options.to };
    for ( var k = 0, lenk = test.keys.length; k < lenk; ++k ) {
      var key = test.keys[k];
    }
  }

  return _.map( tests, function( test ) {
    return {
      name: test.keys.join(','),
      query: test.query,
      count: test.count
    };
  });
};

