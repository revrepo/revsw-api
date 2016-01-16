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

  var account_id = request.query.account_id,
    app_id = request.query.app_id || '',
    delta = span.end - span.start,
    interval;

  if ( !account_id && !app_id ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
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
            } ]
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

  var account_id = request.query.account_id,
    app_id = request.query.app_id || '',
    count = request.query.count || 0,
    report_type = request.query.report_type || 'country';

  if ( !account_id && !app_id ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
  }

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

  var account_id = request.query.account_id,
    app_id = request.query.app_id || '',
    count = request.query.count || 0,
    report_type = request.query.report_type || 'country';

  if ( !account_id && !app_id ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
  }

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
      console.trace(error.message);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });
};

//  ---------------------------------
exports.getTopGBT = function( request, reply ) {

  var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
  if ( span.error ) {
    return reply( boom.badRequest( span.error ) );
  }

  var account_id = request.query.account_id,
    app_id = request.query.app_id || '',
    count = request.query.count || 0,
    report_type = request.query.report_type || 'country';

  if ( !account_id && !app_id ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
  }

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
      console.trace(error.message);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });
};

//  ---------------------------------
exports.getDistributions = function( request, reply ) {

  var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
  if ( span.error ) {
    return reply( boom.badRequest( span.error ) );
  }

  var account_id = request.query.account_id,
    app_id = request.query.app_id || '',
    count = request.query.count || 0,
    report_type = request.query.report_type || 'destination';

  if ( !account_id && !app_id ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
  }

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
                terms: { field: field },
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
          if ( keys[item.key] ) {
            item.key = keys[item.key];
            data.push({
              key: item.key,
              count: item.doc_count,
              received_bytes: item.received_bytes.value,
              sent_bytes: item.sent_bytes.value
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
      console.trace(error.message);
      return reply(boom.badImplementation('Failed to retrieve data from ES'));
    });
};

