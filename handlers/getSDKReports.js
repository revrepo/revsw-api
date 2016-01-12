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

//  ----------------------------------------------------------------------------------------------//
exports.getAppReport = function( request, reply ) {

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
      console.trace( error.message );
      return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
    } );
};

//  ---------------------------------
exports.getAccountReport = function( request, reply ) {

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
      console.trace( error.message );
      return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
    } );
};

//  ---------------------------------
exports.getFlowReport = function( request, reply ) {

  var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
  if ( span.error ) {
    return reply( boom.badRequest( span.error ) );
  }

  var account_id = request.params.account_id,
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
            } ]
          }
        }
      }
    },
    aggs: {
      reqs: {
        nested: {
          'path': 'requests'
        },
        aggs: {
          result: {
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
  };

  elasticSearch.getClient().search( {
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
      if ( body.aggregations ) {
        for ( var i = 0, len = body.aggregations.reqs.result.buckets.length; i < len; i++ ) {
          var item = body.aggregations.reqs.result.buckets[i];
          dataArray[i] = {
            time: item.key,
            time_as_string: item.key_as_string,
            hits: item.doc_count,
            received_bytes: item.received_bytes.value,
            sent_bytes: item.sent_bytes.value
          };
          total_hits += item.doc_count;
          total_received += item.received_bytes.value;
          total_sent += item.sent_bytes.value;
        }
      }
      var response = {
        metadata: {
          account_id: account_id,
          app_id: ( app_id || '*' ),
          start_timestamp: span.start,
          start_datetime: new Date( span.start ),
          end_timestamp: span.end,
          end_datetime: new Date( span.end ),
          total_hits: total_hits,
          total_received: total_received,
          total_sent: total_sent
        },
        data: dataArray
      };
      renderJSON( request, reply, false, response );
    }, function( error ) {
      console.trace( error.message );
      return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
    } );
};

//  ---------------------------------
exports.getTopRequests = function( request, reply ) {

  var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
  if ( span.error ) {
    return reply( boom.badRequest( span.error ) );
  }

  var account_id = request.params.account_id,
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
          account_id: account_id,
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
      console.trace(error.message);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });

};


//  ---------------------------------
exports.getTopUsers = function( request, reply ) {

  var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
  if ( span.error ) {
    return reply( boom.badRequest( span.error ) );
  }

  var account_id = request.params.account_id,
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
          account_id: account_id,
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
      console.trace(error.message);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });

};

//  ----------------------------------------------------------------------------------------------//
//  dump




//  ---------------------------------
// exports.getHitsReport__ = function( request, reply ) {

//   var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
//   if ( span.error ) {
//     return reply( boom.badRequest( span.error ) );
//   }

//   var account_id = request.params.account_id,
//     app_id = request.query.app_id || '',
//     delta = span.end - span.start,
//     interval;

//   if ( delta <= 3 * 3600000 ) {
//     interval = 5 * 60000; // 5 minutes
//   } else if ( delta <= 2 * 24 * 3600000 ) {
//     interval = 30 * 60000; // 30 minutes
//   } else if ( delta <= 8 * 24 * 3600000 ) {
//     interval = 3 * 3600000; // 3 hours
//   } else {
//     interval = 12 * 3600000; // 12 hours
//   }

//   var requestBody = {
//     size: 0,
//     query: {
//       filtered: {
//         filter: {
//           bool: {
//             must: [ {
//               term: ( app_id ? { app_id: app_id } : { account_id: account_id } )
//             }, {
//               range: {
//                 'received_at': {
//                   gte: span.start,
//                   lt: span.end
//                 }
//               }
//             } ]
//           }
//         }
//       }
//     },
//     aggs: {
//       results: {
//         date_histogram: {
//           field: 'received_at',
//           interval: ( '' + interval ),
//           min_doc_count: 0,
//           extended_bounds : {
//             min: span.start,
//             max: ( span.end - 1 )
//           },
//           offset: ( '' + ( span.end % interval ) )
//         },
//         aggs: {
//           hits: {
//             sum: {
//               field: 'hits'
//             }
//           }
//         }
//       }
//     }
//   };

//   elasticSearch.getClient().search( {
//       index: utils.buildIndexList( span.start, span.end, 'sdkstats-' ),
//       ignoreUnavailable: true,
//       timeout: 120000,
//       body: requestBody
//     } )
//     .then( function( body ) {

//       var dataArray = [];
//       for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; i++ ) {
//         var item = body.aggregations.results.buckets[i];
//         dataArray[i] = {
//           time: item.key,
//           requests: item.doc_count,
//           hits: item.hits.value
//         };
//       }
//       var response = {
//         metadata: {
//           account_id: account_id,
//           app_id: ( app_id || '*' ),
//           start_timestamp: span.start,
//           start_datetime: new Date( span.start ),
//           end_timestamp: span.end,
//           end_datetime: new Date( span.end ),
//           total_hits: body.hits.total
//         },
//         data: dataArray
//       };
//       renderJSON( request, reply, false, response );
//     }, function( error ) {
//       console.trace( error.message );
//       return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
//     } );
// };


