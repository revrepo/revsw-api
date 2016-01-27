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
//  ----------------------------------------------------------------------------------------------//

var boom = require( 'boom' );
var utils = require( '../lib/utilities.js' );
var renderJSON = require( '../lib/renderJSON' );
var elasticSearch = require( '../lib/elasticSearch' );

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var mongoose = require('mongoose');
var mongoConnection = require('../lib/mongoConnections');
var App = require('../models/App');
var apps = new App(mongoose, mongoConnection.getConnectionPortal());


  // checkUserAccessPermissionToDomain: function(request, domainObject) {
  //   // Allow full access to Revadmin role
  //   if (request.auth.credentials.role === 'revadmin') {
  //     return true;
  //   // Allow access to Admin and Reseller who manage the company
  //   } else if ((request.auth.credentials.role === 'reseller' || request.auth.credentials.role === 'admin') &&
  //     (request.auth.credentials.companyId.indexOf(domainObject.account_id) !== -1)) {
  //     return true;
  //   // For user role allow the access only if the user belongs to the company and has permissions to manage the specific domain
  //   } else if ((request.auth.credentials.role === 'user' && request.auth.credentials.companyId.indexOf(domainObject.proxy_config.account_id) !== -1 &&
  //     request.auth.credentials.domain.indexOf(domainObject.domain_name) !== -1)) {
  //     return true;  // allow access
  //   } else {
  //     return false;  // deny access
  //   }
  // },


//  ---------------------------------
var check_app_access_ = function( request, reply, callback ) {

  var account_id = request.query.account_id || request.params.account_id || '';
  var app_id = request.query.app_id || request.params.app_id || '';
  if ( !account_id && !app_id ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
  }

  var creds = request.auth.credentials;
  //  user is revadmin
  if ( creds.role === 'revadmin' ) {
    return callback();
  }

  //  account(company)
  if ( account_id &&
      creds.companyId.indexOf( account_id ) === -1 ) {
      //  user's companyId array must contain requested account ID
    return reply(boom.badRequest( 'Account ID not found' ));
  }

  //  app
  if ( app_id ) {
    apps.getAccountID( app_id, function( err, acc_id ) {
      if ( err ) {
        return reply( boom.badImplementation( err ) );
      }
      if ( creds.companyId.indexOf( acc_id ) === -1 ) {
        return reply(boom.badRequest( 'Application ID not found' ));
      }
      callback();
    });
  } else {
    callback();
  }
};

//  ----------------------------------------------------------------------------------------------//

exports.getAppReport = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }
    var app_id = request.params.app_id;
    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: {
                  app_id: app_id
                }
              }, {
                range: {
                  'received_at': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      }
    };

    if ( request.query.report_type === 'devices' ) {
      requestBody.aggs = {
        devices_num: {
          cardinality: {
            field: 'serial_number',
            precision_threshold: 100
          }
        }
      };
    }

    elasticSearch.getClient().search( {
        index: utils.buildIndexList( span.start, span.end, 'sdkstats-' ),
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then( function( body ) {
        var response = {
          metadata: {
            app_id: app_id,
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            total_hits: body.hits.total
          },
          data: {
            hits: body.hits.total,
            devices_num: ( ( body.aggregations && body.aggregations.devices_num.value ) || 0 )
          }
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        logger.error( error );
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );
  });
};

//  ---------------------------------
exports.getAccountReport = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.params.account_id;
    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: {
                  account_id: account_id
                }
              }, {
                range: {
                  'received_at': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      }
    };

    if ( request.query.report_type === 'devices' ) {
      requestBody.aggs = {
        devices_num: {
          cardinality: {
            field: 'serial_number',
            precision_threshold: 100
          }
        }
      };
    }

    elasticSearch.getClient().search( {
        index: utils.buildIndexList( span.start, span.end, 'sdkstats-' ),
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then( function( body ) {
        var response = {
          metadata: {
            account_id: account_id,
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            total_hits: body.hits.total
          },
          data: {
            hits: body.hits.total,
            devices_num: ( ( body.aggregations && body.aggregations.devices_num.value ) || 0 )
          }
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        logger.error( error );
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );
  });
};

//  ---------------------------------
exports.getDirs = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '' ;

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      },
      aggs: {
        oses: {
          terms: {
            field: 'device.os'
          }
        },
        devices: {
          terms: {
            field: 'device.device'
          }
        },
        countries: {
          terms: {
            field: 'geoip.country_code2'
          }
        },
        operators: {
          terms: {
            field: 'carrier.sim_operator'
          }
        }
      }
    };

    elasticSearch.getClientURL().search( {
        index: utils.buildIndexList( span.start, span.end, 'sdkstats-' ),
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then( function( body ) {

        var data = {
          devices: [],
          operators: [],
          oses: [],
          countries: {}
        };
        // "aggregations": {
        //   "devices": {
        //     "doc_count_error_upper_bound": 0,
        //     "sum_other_doc_count": 0,
        //     "buckets": [
        //       {
        //         "key": "iPhone4,1 A1387/A1431",
        //         "doc_count": 312
        //       }, ...............
        //     ]
        //   },
        //   "operators": {
        //     "doc_count_error_upper_bound": 0,
        //     "sum_other_doc_count": 0,
        //     "buckets": [
        //       {
        //         "key": "AT&T",
        //         "doc_count": 328
        //       }, ..................
        //     ]
        //   },
        //   "oses": { .............
        //   },
        //   "countries": { ...............
        //   }
        // }

        if ( body.aggregations ) {
          var buckets = body.aggregations.devices.buckets;
          for ( var i = 0, len = buckets.length; i < len; i++ ) {
            data.devices.push( buckets[i].key );
          }
          buckets = body.aggregations.operators.buckets;
          var unknown_added = false;
          for ( i = 0, len = buckets.length; i < len; i++ ) {
            if ( buckets[i].key === '-' || buckets[i].key === '*' || buckets[i].key === '_' || buckets[i].key === '' ) {
              if ( !unknown_added ) {
                unknown_added = true;
                data.operators.push( 'Unknown' );
              }
            } else {
              data.operators.push( buckets[i].key );
            }
          }
          buckets = body.aggregations.oses.buckets;
          for ( i = 0, len = buckets.length; i < len; i++ ) {
            data.oses.push( buckets[i].key );
          }
          buckets = body.aggregations.countries.buckets;
          for ( i = 0, len = buckets.length; i < len; i++ ) {
            data.countries[buckets[i].key] = utils.countries[buckets[i].key] || buckets[i].key;
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            total_hits: body.hits.total
          },
          data: data
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        logger.error( error );
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

//  ---------------------------------
exports.getFlowReport = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      delta = span.end - span.start,
      interval;

    if ( delta <= 3 * 3600000 ) {
      interval = 5 * 60000; // 5 minutes
    } else if ( delta <= 2 * 24 * 3600000 ) {
      interval = 30 * 60000; // 30 minutes
    } else if ( delta <= 8 * 24 * 3600000 ) {
      interval = 3 * 3600000; // 3 hours
    } else {
      interval = 12 * 3600000; // 12 hours
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ],
              must_not: []
            }
          }
        }
      },
      aggs: {
        results: {
          nested: {
            'path': 'requests'
          },
          aggs: {
            date_range: {
              range: {
                field: 'requests.start_ts',
                ranges: [{ from: span.start, to: (span.end - 1) }]
              },
              aggs: {
                date_histogram: {
                  date_histogram: {
                    field: 'requests.start_ts',
                    interval: ( '' + interval ),
                    min_doc_count: 0,
                    extended_bounds : {
                      min: span.start,
                      max: span.end - 1
                    },
                    offset: ( '' + ( span.end % interval ) )
                  },
                  aggs: {
                    received_bytes: {
                      sum: {
                        field: 'requests.received_bytes'
                      }
                    },
                    sent_bytes: {
                      sum: {
                        field: 'requests.sent_bytes'
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

    var terms = elasticSearch.buildESQueryTerms4SDK(request);
    var sub = requestBody.query.filtered.filter.bool;
    sub.must = sub.must.concat( terms.must );
    sub.must_not = sub.must_not.concat( terms.must_not );

    elasticSearch.getClientURL().search( {
        index: utils.buildIndexList( span.start, span.end, 'sdkstats-' ),
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then( function( body ) {

        var total_hits = 0;
        var total_sent = 0;
        var total_received = 0;
        var dataArray = [];
        // "aggregations": {
        //   "results": {
        //     "doc_count": 9275,
        //     "date_range": {
        //       "buckets": [
        //         {
        //           "key": "2016-01-15T00:45:00.000Z-2016-01-16T00:44:59.999Z",
        //           "from": 1452818700000,
        //           "from_as_string": "2016-01-15T00:45:00.000Z",
        //           "to": 1452905099999,
        //           "to_as_string": "2016-01-16T00:44:59.999Z",
        //           "doc_count": 9273,
        //           "date_histogram": {
        //             "buckets": [
        //               {
        //                 "key_as_string": "2016-01-15T00:45:00.000Z",
        //                 "key": 1452818700000,
        //                 "doc_count": 0,
        //                 "received_bytes": {
        //                   "value": 0
        //                 },
        //                 "sent_bytes": {
        //                   "value": 0
        //                 }
        //               },

        if ( body.aggregations ) {
          var buckets = body.aggregations.results.date_range.buckets[0].date_histogram.buckets;
          for ( var i = 0, len = buckets.length; i < len; i++ ) {
            var item = buckets[i];
            dataArray.push({
              time: item.key,
              time_as_string: item.key_as_string,
              hits: item.doc_count,
              received_bytes: item.received_bytes.value,
              sent_bytes: item.sent_bytes.value
            });
            total_hits += item.doc_count;
            total_received += item.received_bytes.value;
            total_sent += item.sent_bytes.value;
          }
        }
        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( interval / 1000 ) ),
            total_hits: total_hits,
            total_received: total_received,
            total_sent: total_sent
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        logger.error( error );
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

//  ---------------------------------
exports.getAggFlowReport = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 7 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      delta = span.end - span.start,
      interval,
      report_type = request.query.report_type || 'status_code';

    var field, keys;
    switch (report_type) {
      case 'status_code':
        field = 'requests.status_code';
        keys = {};
        break;
      case 'destination':
        field = 'requests.destination';
        keys = {
          'origin': 'Origin',
          'rev_edge': 'RevAPM'
        };
        break;
      case 'transport':
        field = 'requests.edge_transport';
        keys = {
          'standard': 'Standard',
          'quic': 'QUIC'
        };
        break;
      case 'status':
        field = 'requests.success_status';
        keys = {
          '0': 'Error',
          '1': 'Success'
        };
        break;
      case 'cache':
        field = 'requests.x-rev-cache';
        keys = {
          'HIT': 'HIT',
          'MISS': 'MISS'
        };
        break;
      default:
        return reply(boom.badImplementation('Received bad report_type value ' + report_type));
    }

    if ( delta <= 3 * 3600000 ) {
      interval = 5 * 60000; // 5 minutes
    } else if ( delta <= 2 * 24 * 3600000 ) {
      interval = 30 * 60000; // 30 minutes
    } else if ( delta <= 8 * 24 * 3600000 ) {
      interval = 3 * 3600000; // 3 hours
    } else {
      interval = 12 * 3600000; // 12 hours
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ],
              must_not: []
            }
          }
        }
      },
      aggs: {
        results: {
          nested: {
            'path': 'requests'
          },
          aggs: {
            date_range: {
              range: {
                field: 'requests.start_ts',
                ranges: [{ from: span.start, to: (span.end - 1) }]
              },
              aggs: {
                codes: {
                  terms: { field: field },
                  aggs: {
                    date_histogram: {
                      date_histogram: {
                        field: 'requests.start_ts',
                        interval: ( '' + interval ),
                        min_doc_count: 0,
                        extended_bounds : {
                          min: span.start,
                          max: span.end - 1
                        },
                        offset: ( '' + ( span.end % interval ) )
                      },
                      aggs: {
                        received_bytes: {
                          sum: {
                            field: 'requests.received_bytes'
                          }
                        },
                        sent_bytes: {
                          sum: {
                            field: 'requests.sent_bytes'
                          }
                        }
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

    var terms = elasticSearch.buildESQueryTerms4SDK(request);
    var sub = requestBody.query.filtered.filter.bool;
    sub.must = sub.must.concat( terms.must );
    sub.must_not = sub.must_not.concat( terms.must_not );

    elasticSearch.getClientURL().search( {
        index: utils.buildIndexList( span.start, span.end, 'sdkstats-' ),
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then( function( body ) {

        var total_hits = 0;
        var total_sent = 0;
        var total_received = 0;
        var dataArray = [];
        // "aggregations": {
        //   "results": {
        //     "doc_count": 56531,
        //     "date_range": {
        //       "buckets": [
        //         {
        //           "key": "2016-01-20T21:15:00.000Z-2016-01-21T21:14:59.999Z",
        //           "from": 1453324500000,
        //           "from_as_string": "2016-01-20T21:15:00.000Z",
        //           "to": 1453410899999,
        //           "to_as_string": "2016-01-21T21:14:59.999Z",
        //           "doc_count": 56364,
        //           "codes": {
        //             "doc_count_error_upper_bound": 0,
        //             "sum_other_doc_count": 82,
        //             "buckets": [
        //               {
        //                 "key": 200,
        //                 "doc_count": 47705
        //                 "date_histogram": {
        //                   "buckets": [
        //                     {
        //                       "key_as_string": "2016-01-20T21:20:00.000Z",
        //                       "key": 1453324800000,
        //                       "doc_count": 0,
        //                       "received_bytes": {
        //                         "value": 0
        //                       },
        //                       "sent_bytes": {
        //                         "value": 0
        //                       }
        //                     },
        //                     {
        //                       "key_as_string": "2016-01-20T21:50:00.000Z",
        //                       "key": 1453326600000,
        //                       "doc_count": 5,
        //                       "received_bytes": {
        //                         "value": 175
        //                       },
        //                       "sent_bytes": {
        //                         "value": 0
        //                       }
        //                     }, ...............................
        //               },
        //               {
        //                 "key": 404,
        //                 "doc_count": 4588
        //                 ......................................
        //               },......................................

        if ( body.aggregations ) {
          var codes = body.aggregations.results.date_range.buckets[0].codes.buckets;
          for ( var ci = 0, clen = codes.length; ci < clen; ++ci ) {
            if ( report_type === 'status_code' && codes[ci].key === 0 ) {
              //  0 http status code actually means absense of the code in a failed requests
              continue;
            }
            var data = {
              key: ( keys[codes[ci].key] || codes[ci].key ),
              flow: [],
              hits: 0,
              received_bytes: 0,
              sent_bytes: 0
            };
            var code_hits = 0;
            var code_sent = 0;
            var code_received = 0;
            var flow = codes[ci].date_histogram.buckets;
            for ( var fi = 0, flen = flow.length; fi < flen; ++fi ) {
              var item = flow[fi];
              data.flow.push({
                time: item.key,
                time_as_string: item.key_as_string,
                hits: item.doc_count,
                received_bytes: item.received_bytes.value,
                sent_bytes: item.sent_bytes.value
              });
              data.hits += item.doc_count;
              data.received_bytes += item.received_bytes.value;
              data.sent_bytes += item.sent_bytes.value;
            }
            dataArray.push( data );
            total_hits += data.hits;
            total_sent += data.received_bytes;
            total_received += data.sent_bytes;
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( interval / 1000 ) ),
            total_hits: total_hits,
            total_received: total_received,
            total_sent: total_sent
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        logger.error( error );
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

//  ---------------------------------
exports.getTopRequests = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 0,
      report_type = request.query.report_type || 'country';

    var field;
    switch (report_type) {
      case 'country':
        field = 'geoip.country_code2';
        break;
      case 'os':
        field = 'device.os';
        break;
      case 'device':
        field = 'device.device';
        break;
      case 'operator':
        field = 'carrier.net_operator';
        break;
      case 'network':
        field = 'carrier.signal_type';
        break;
      default:
        return reply(boom.badImplementation('Received bad report_type value ' + report_type));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      },
      aggs: {
        results: {
          terms: {
            field: field,
            size: count,
            order: {
              _count: 'desc'
            }
          },
          aggs: {
            hits: {
              nested: {
                path: 'requests'
              },
              aggs: {
                hits: {
                  range: {
                    field: 'requests.start_ts',
                    ranges: [{ from: span.start, to: (span.end - 1) }]
                  }
                }
              }
            }
          }
        },
        missing_field: {
          missing: {
            field: field
          }
        }
      }
    };

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      })
      .then(function(body) {
        /*
        "aggregations": {
          "missing_field": {
            "doc_count": 0
          },
          "results": {
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": [
              {
                "key": "WiFi",
                "doc_count": 1,
                "hits": {
                  "doc_count": 500,
                  "hits": {
                    "buckets": [
                      {
                        "key": "2016-01-10T09:45:00.000Z-2016-01-10T09:49:59.999Z",
                        "from": 1452419100000,
                        "from_as_string": "2016-01-10T09:45:00.000Z",
                        "to": 1452419399999,
                        "to_as_string": "2016-01-10T09:49:59.999Z",
                        "doc_count": 496
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
        */

        var data = [];
        if ( body.aggregations ) {
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
            var item = body.aggregations.results.buckets[i];
            data.push({
              key: item.key,
              count: ( ( item.hits && item.hits.hits && item.hits.hits.buckets.length && item.hits.hits.buckets[0].doc_count ) || 0 )
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopUsers = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 0,
      report_type = request.query.report_type || 'country';

    var field;
    switch (report_type) {
      case 'country':
        field = 'geoip.country_code2';
        break;
      case 'os':
        field = 'device.os';
        break;
      case 'device':
        field = 'device.device';
        break;
      case 'operator':
        field = 'carrier.net_operator';
        break;
      case 'network':
        field = 'carrier.signal_type';
        break;
      default:
        return reply(boom.badImplementation('Received bad report_type value ' + report_type));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      },
      aggs: {
        results: {
          terms: {
            field: field,
            size: count,
            order: {
              _count: 'desc'
            }
          },
          aggs: {
            users: {
              cardinality: {
                field: 'device.uuid',
                precision_threshold: 100
              }
            }
          }
        },
        missing_field: {
          missing: {
            field: field
          }
        }
      }
    };

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then(function(body) {

        var data = [];
        if ( body.aggregations ) {
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
            var item = body.aggregations.results.buckets[i];
            data.push({
              key: item.key,
              count: ( ( item.users && item.users.value ) || 0 )
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopGBT = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 0,
      report_type = request.query.report_type || 'country';

    var field;
    switch (report_type) {
      case 'country':
        field = 'geoip.country_code2';
        break;
      case 'os':
        field = 'device.os';
        break;
      case 'device':
        field = 'device.device';
        break;
      case 'operator':
        field = 'carrier.net_operator';
        break;
      case 'network':
        field = 'carrier.signal_type';
        break;
      default:
        return reply(boom.badImplementation('Received bad report_type value ' + report_type));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      },
      aggs: {
        results: {
          terms: {
            field: field,
            size: count,
            order: {
              _count: 'desc'
            }
          },
          aggs: {
            deep: {
              nested: {
                path: 'requests'
              },
              aggs: {
                hits: {
                  range: {
                    field: 'requests.start_ts',
                    ranges: [{ from: span.start, to: (span.end - 1) }]
                  },
                  aggs: {
                    received_bytes: {
                      sum: {
                        field: 'requests.received_bytes'
                      }
                    },
                    sent_bytes: {
                      sum: {
                        field: 'requests.sent_bytes'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        missing_field: {
          missing: {
            field: field
          }
        }
      }
    };

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then(function(body) {

        /*
          "aggregations": {
            "missing_field": {
              "doc_count": 0
            },
            "results": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "iPhone7,2 A1549/A1586",
                  "doc_count": 1,
                  "deep": {
                    "doc_count": 500,
                    "hits": {
                      "buckets": [
                        {
                          "key": "2016-01-10T00:45:00.000Z-2016-01-12T00:44:59.999Z",
                          "from": 1452386700000,
                          "from_as_string": "2016-01-10T00:45:00.000Z",
                          "to": 1452559499999,
                          "to_as_string": "2016-01-12T00:44:59.999Z",
                          "doc_count": 500,
                          "received_bytes": {
                            "value": 10051575
                          }
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        */

        var data = [];
        if ( body.aggregations ) {
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
            var item = body.aggregations.results.buckets[i];
            if ( item.deep && item.deep.hits && item.deep.hits.buckets.length ) {
              var deep = item.deep.hits.buckets[0];
              data.push({
                key: item.key,
                count: deep.doc_count,
                received_bytes: deep.received_bytes.value,
                sent_bytes: deep.sent_bytes.value
              });
            } else {
              data.push({
                key: item.key,
                count: 0,
                received_bytes: 0,
                sent_bytes: 0
              });
            }
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getDistributions = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 30,
      report_type = request.query.report_type || 'destination';

    var field, keys;
    switch (report_type) {
      case 'destination':
        field = 'requests.destination';
        keys = {
          'origin': 'Origin',
          'rev_edge': 'RevAPM'
        };
        break;
      case 'transport':
        field = 'requests.edge_transport';
        keys = {
          'standard': 'Standard',
          'quic': 'QUIC'
        };
        break;
      case 'status':
        field = 'requests.success_status';
        keys = {
          '0': 'Error',
          '1': 'Success'
        };
        break;
      case 'cache':
        field = 'requests.x-rev-cache';
        keys = {
          'HIT': 'HIT',
          'MISS': 'MISS'
        };
        break;
      case 'domain':
        field = 'requests.domain';
        keys = {
          allow_any: true
        };
        break;
      case 'status_code':
        field = 'requests.status_code';
        keys = {
          allow_any: true
        };
        break;
      default:
        return reply(boom.badImplementation('Received bad report_type value ' + report_type));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ]
            }
          }
        }
      },

      aggs: {
        result: {
          nested: {
            path: 'requests'
          },
          aggs: {
            result: {
              range: {
                field: 'requests.start_ts',
                ranges: [{ from: span.start, to: (span.end - 1) }]
              },
              aggs: {
                distribution: {
                  terms: {
                    field: field,
                    size: count
                  }
                }
              }
            }
          }
        }
      }
    };
    if ( report_type !== 'status_code' ) {
      requestBody.aggs.result.aggs.result.aggs.distribution.aggs = {
        received_bytes: {
          sum: {
            field: 'requests.received_bytes'
          }
        },
        sent_bytes: {
          sum: {
            field: 'requests.sent_bytes'
          }
        }
      };
    }

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then(function(body) {

        /*
        "aggregations": {
        "result": {
          "doc_count": 3991,
          "result": {
            "buckets": [
              {
                "key": "2016-01-13T22:50:00.000Z-2016-01-14T22:49:59.999Z",
                "from": 1452725400000,
                "from_as_string": "2016-01-13T22:50:00.000Z",
                "to": 1452811799999,
                "to_as_string": "2016-01-14T22:49:59.999Z",
                "doc_count": 3991,
                "distribution": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "MISS",
                      "doc_count": 1740,
                      "received_bytes": {
                        "value": 28208157
                      },
                      "sent_bytes": {
                        "value": 3767
                      }
                    },
                    {
                      "key": "HIT",
                      "doc_count": 1240,
                      "received_bytes": {
                        "value": 112072849
                      },
                      "sent_bytes": {
                        "value": 0
                      }
                    },
                    {
                      "key": "-",
                      "doc_count": 1011,
                      "received_bytes": {
                        "value": 60997388
                      },
                      "sent_bytes": {
                        "value": 0
                      }
                    }
                  ]
                }
              }
            ]
          }
        }}

        //  empty
        "aggregations": {
          "result": {
            "doc_count": 0,
            "result": {
              "buckets": [
                {
                  "key": "2016-01-13T22:50:00.000Z-2016-01-14T22:49:59.999Z",
                  "from": 1452725400000,
                  "from_as_string": "2016-01-13T22:50:00.000Z",
                  "to": 1452811799999,
                  "to_as_string": "2016-01-14T22:49:59.999Z",
                  "doc_count": 0,
                  "distribution": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": []
                  }
                }
              ]
            }
          }
        }

        */

        var data = [];
        if ( body.aggregations && body.aggregations.result.doc_count ) {
          for ( var i = 0, len = body.aggregations.result.result.buckets[0].distribution.buckets.length; i < len; ++i ) {
            var item = body.aggregations.result.result.buckets[0].distribution.buckets[i];
            if ( keys.allow_any || keys[item.key] ) {
              item.key = keys[item.key] || item.key;
              data.push({
                key: item.key,
                count: item.doc_count,
                received_bytes: ( ( item.received_bytes && item.received_bytes.value ) || 0 ),
                sent_bytes: ( ( item.sent_bytes && item.sent_bytes.value ) || 0 )
              });
            }
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};


//  ---------------------------------
exports.getTopObjects = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 30;

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ],
              must_not: []
            }
          }
        }
      },

      aggs: {
        result: {
          nested: {
            path: 'requests'
          },
          aggs: {
            result: {
              range: {
                field: 'requests.start_ts',
                ranges: [{ from: span.start, to: (span.end - 1) }]
              },
              aggs: {
                urls: {
                  terms: {
                    field: 'requests.url',
                    size: count
                  }
                }
              }
            }
          }
        }
      }
    };

    var terms = elasticSearch.buildESQueryTerms4SDK(request);
    var sub = requestBody.query.filtered.filter.bool;
    sub.must = sub.must.concat( terms.must );
    sub.must_not = sub.must_not.concat( terms.must_not );

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then(function(body) {

        /*
        "aggregations": {
          "result": {
            "doc_count": 1315750,
            "result": {
              "buckets": [{
                "key": "2016-01-26T20:00:00.000Z-*",
                "from": 1453838400000,
                "from_as_string": "2016-01-26T20:00:00.000Z",
                "doc_count": 280500,
                "urls": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [{
                      "key": "https://app.resrc.it/O=100/https://static.ibmserviceengage.com/APImanagementCloud-hero.jpg",
                      "doc_count": 5610
                    }, {
                      "key": "https://tags.tiqcdn.com/utag/ibm/main/prod/utag.694.js?utv=ut4.39.201601151731",
                      "doc_count": 5610
                    },

        //  empty
        "aggregations": {
          "result": {
            "doc_count": 1315750,
            "result": {
              "buckets": [{
                "key": "2016-01-26T23:00:00.000Z-*",
                "from": 1453849200000,
                "from_as_string": "2016-01-26T23:00:00.000Z",
                "doc_count": 0,
                "urls": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": []
                }
              }]
            }
          }
        }
        */

        var data = [],
          total = 0,
          len = ( ( body.aggregations && body.aggregations.result.result.buckets[0].urls.buckets.length ) || 0 );
        if ( len ) {
          total = body.aggregations.result.result.buckets[0].doc_count;
          for ( var i = 0; i < len; ++i ) {
            var item = body.aggregations.result.result.buckets[0].urls.buckets[i];
            data.push({
              key: item.key,
              count: item.doc_count
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopObjectsSlowest = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 30,
      report_type = request.query.report_type || 'response';

    var field;
    switch (report_type) {
      case 'response':
        field = 'requests.end_ts';
        break;
      case 'first_byte':
        field = 'requests.first_byte_ts';
        break;
      default:
        return reply(boom.badImplementation('Received bad report_type value ' + report_type));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ],
              must_not: []
            }
          }
        }
      },

      aggs: {
        result: {
          nested: {
            path: 'requests'
          },
          aggs: {
            result: {
              range: {
                field: 'requests.start_ts',
                ranges: [{ from: span.start, to: (span.end - 1) }]
              },
              aggs: {
                urls: {
                  terms: {
                    field: 'requests.url',
                    // min_doc_count: 10,
                    order: { avg_time : 'desc' },
                    size: count
                  },
                  aggs: {
                    avg_time: {
                      avg: { field: field }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    var terms = elasticSearch.buildESQueryTerms4SDK(request);
    var sub = requestBody.query.filtered.filter.bool;
    sub.must = sub.must.concat( terms.must );
    sub.must_not = sub.must_not.concat( terms.must_not );

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then(function(body) {

        /*
        "aggregations": {
          "result": {
            "doc_count": 1315750,
            "result": {
              "buckets": [{
                "key": "2016-01-26T20:00:00.000Z-*",
                "from": 1453838400000,
                "from_as_string": "2016-01-26T20:00:00.000Z",
                "doc_count": 280500,
                "urls": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [{
                      "key": "https://app.resrc.it/O=100/https://static.ibmserviceengage.com/APImanagementCloud-hero.jpg",
                      "doc_count": 5610,
                      "avg_time": {
                        "value": 2944,
                        "value_as_string": "1970-01-01T00:00:02.944Z"
                      }
                    }, {
                      "key": "https://tags.tiqcdn.com/utag/ibm/main/prod/utag.694.js?utv=ut4.39.201601151731",
                      "doc_count": 5610,
                      "avg_time": {
                        "value": 2349,
                        "value_as_string": "1970-01-01T00:00:02.349Z"
                      }
                    },

        //  empty
        "aggregations": {
          "result": {
            "doc_count": 1315750,
            "result": {
              "buckets": [{
                "key": "2016-01-26T23:00:00.000Z-*",
                "from": 1453849200000,
                "from_as_string": "2016-01-26T23:00:00.000Z",
                "doc_count": 0,
                "urls": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": []
                }
              }]
            }
          }
        }
        */

        var data = [],
          total = 0,
          len = ( ( body.aggregations && body.aggregations.result.result.buckets[0].urls.buckets.length ) || 0 );
        if ( len ) {
          total = body.aggregations.result.result.buckets[0].doc_count;
          for ( var i = 0; i < len; ++i ) {
            var item = body.aggregations.result.result.buckets[0].urls.buckets[i];
            data.push({
              key: item.key,
              count: item.doc_count,
              val: item.avg_time.value
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopObjectsHTTPCodes = function( request, reply ) {

  check_app_access_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var account_id = request.query.account_id,
      app_id = request.query.app_id || '',
      count = request.query.count || 30,
      from_code = request.query.from_code,
      to_code = request.query.to_code;

    if ( from_code >= to_code ) {
      return reply( boom.badRequest( '"from_code" parameter should be less then "to_code"' ) );
    }


    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
              }, {
                range: {
                  'start_ts': {
                    gte: span.start,
                    lt: span.end
                  }
                }
              } ],
              must_not: []
            }
          }
        }
      },

      aggs: {
        result: {
          nested: {
            path: 'requests'
          },
          aggs: {
            result: {
              range: {
                field: 'requests.start_ts',
                ranges: [{ from: span.start, to: (span.end - 1) }]
              },
              aggs: {
                codes: {
                  range: {
                    field: 'requests.status_code',
                    ranges: [{ from: from_code, to: to_code }]
                  },
                  aggs: {
                    urls: {
                      terms: {
                        field: 'requests.url',
                        size: count
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

    var terms = elasticSearch.buildESQueryTerms4SDK(request);
    var sub = requestBody.query.filtered.filter.bool;
    sub.must = sub.must.concat( terms.must );
    sub.must_not = sub.must_not.concat( terms.must_not );

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: 120000,
        body: requestBody
      } )
      .then(function(body) {

        /*
        "aggregations": {
          "result": {
            "doc_count": 650,
            "result": {
              "buckets": [
                {
                  "key": "2016-01-27T01:05:00.000Z-2016-01-27T02:04:59.999Z",
                  "from": 1453856700000,
                  "from_as_string": "2016-01-27T01:05:00.000Z",
                  "to": 1453860299999,
                  "to_as_string": "2016-01-27T02:04:59.999Z",
                  "doc_count": 649,
                  "codes": {
                    "buckets": [
                      {
                        "key": "200.0-210.0",
                        "from": 200,
                        "from_as_string": "200.0",
                        "to": 210,
                        "to_as_string": "210.0",
                        "doc_count": 621,
                        "urls": {
                          "doc_count_error_upper_bound": 2,
                          "sum_other_doc_count": 578,
                          "buckets": [
                            {
                              "key": "https://www.hpe.com/us/en/home.html",
                              "doc_count": 14
                            },
                            {
                              "key": "http://google.com/client_204?atyp=i&biw=320&bih=370&dpr=2&ei=nBioVsqBLMTgjwO557KgBA",
                              "doc_count": 1
                            },

        //  empty
        "aggregations": {
          "result": {
            "doc_count": 650,
            "result": {
              "buckets": [
                {
                  "key": "2016-01-27T01:05:00.000Z-2016-01-27T02:04:59.999Z",
                  "from": 1453856700000,
                  "from_as_string": "2016-01-27T01:05:00.000Z",
                  "to": 1453860299999,
                  "to_as_string": "2016-01-27T02:04:59.999Z",
                  "doc_count": 649,
                  "codes": {
                    "buckets": [
                      {
                        "key": "500.0-599.0",
                        "from": 500,
                        "from_as_string": "500.0",
                        "to": 599,
                        "to_as_string": "599.0",
                        "doc_count": 0,
                        "urls": {
                          "doc_count_error_upper_bound": 0,
                          "sum_other_doc_count": 0,
                          "buckets": []
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        */

        var data = [],
          total = 0,
          len = ( ( body.aggregations && body.aggregations.result.result.buckets[0].codes.buckets[0].urls.buckets.length ) || 0 );
        if ( len ) {
          total = body.aggregations.result.result.buckets[0].codes.buckets[0].doc_count;
          for ( var i = 0; i < len; ++i ) {
            var item = body.aggregations.result.result.buckets[0].codes.buckets[0].urls.buckets[i];
            data.push({
              key: item.key,
              count: item.doc_count
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( account_id || '*' ),
            app_id: ( app_id || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: total,
            data_points_count: data.length
          },
          data: data
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

