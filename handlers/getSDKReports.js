/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var permissionCheck = require('./../lib/requestPermissionScope');
var maxTimePeriodForTrafficGraphsDays = config.get('max_time_period_for_traffic_graphs_days');
//  ---------------------------------
// TODO Need to move the function to "utils" module
var checkAppAccessPermissions_ = function( request, reply, callback ) {

  var accountID = request.query.account_id || request.params.account_id || '';
  var appID = request.query.app_id || request.params.app_id || '';
  if ( !accountID && !appID ) {
    return reply( boom.badRequest( 'Either Account ID or Application ID should be provided' ) );
  }

  var creds = request.auth.credentials;
  //  user is revadmin
  if ( creds.role === 'revadmin' ) {
    return callback();
  }

  //  account(company)
  if ( accountID &&
      utils.getAccountID(request).indexOf( accountID ) === -1 ) {
      //  user's companyId array must contain requested account ID
    return reply(boom.badRequest( 'Account ID not found' ));
  }

  //  app
  if ( appID ) {
    //  get account ID which the _application_ belongs to
    apps.getAccountID( appID, function( err, accID ) {
      if ( err ) {
        return reply( boom.badImplementation( err ) );
      }

      //  user's companyId array must contain this account ID
      if ( utils.getAccountID(request).indexOf( accID ) === -1 ) {
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

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span(request.query, 24 /*def start in hrs*/, 24 * maxTimePeriodForTrafficGraphsDays /*allowed period - max count days*/);
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }
    var appID = request.params.app_id;
    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: {
                  app_id: appID
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {
        var response = {
          metadata: {
            app_id: appID,
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
        return reply( boom.badImplementation( 'Failed to retrieve data from ES for app ID ' + appID ) );
      } );
  });
};

//  ---------------------------------
exports.getAccountReport = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span(request.query, 24 /*def start in hrs*/, 24 * maxTimePeriodForTrafficGraphsDays /*allowed period - max count days*/);
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.params.account_id;
    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: {
                  account_id: accountID
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {
        var response = {
          metadata: {
            account_id: accountID,
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
        return reply( boom.badImplementation( 'Failed to retrieve data from ES for account ID ' + accountID ) );
      } );
  });
};

//  ---------------------------------
exports.getDirs = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '' ;

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
            field: 'device.model'
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {

        var data = {
          devices: [],
          operators: [],
          oses: [],
          countries: {}
        };

        if ( body.aggregations ) {
          var buckets = body.aggregations.devices.buckets;
          for ( var i = 0, len = buckets.length; i < len; i++ ) {
            data.devices.push( buckets[i].key );
          }
          buckets = body.aggregations.operators.buckets;
          var unknownAdded = false;
          for ( i = 0, len = buckets.length; i < len; i++ ) {
            if ( buckets[i].key === '-' || buckets[i].key === '*' || buckets[i].key === '_' || buckets[i].key === '' ) {
              if ( !unknownAdded ) {
                unknownAdded = true;
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
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES for query ' + JSON.stringify(request.query)));
      } );

  });
};

//  ---------------------------------
exports.getFlowReport = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '';

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                    interval: ( '' + span.interval ),
                    min_doc_count: 0,
                    extended_bounds : {
                      min: span.start,
                      max: span.end - 1
                    },
                    offset: ( '' + ( span.end % span.interval ) )
                  },
                  aggs: {
                    //  "(un)swap incoming and outgoing bandwidth"
                    received_bytes: {
                      sum: {
                        // field: 'requests.received_bytes'
                        field: 'requests.sent_bytes'
                      }
                    },
                    sent_bytes: {
                      sum: {
                        // field: 'requests.sent_bytes'
                        field: 'requests.received_bytes'
                      }
                    },
                    time_spent_ms: {
                      sum: {
                        field: 'requests.end_ts'
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {

        var totalHits = 0,
          totalSent = 0,
          totalReceived = 0,
          totalSpentMs = 0,
          dataArray = [];

        if ( body.aggregations ) {
          var buckets = body.aggregations.results.date_range.buckets[0].date_histogram.buckets;
          for ( var i = 0, len = buckets.length; i < len; i++ ) {
            var item = buckets[i];
            dataArray.push({
              time: item.key,
              time_as_string: item.key_as_string,
              hits: item.doc_count,
              received_bytes: item.received_bytes.value,
              sent_bytes: item.sent_bytes.value,
              time_spent_ms: item.time_spent_ms.value
            });
            totalHits += item.doc_count;
            totalReceived += item.received_bytes.value;
            totalSent += item.sent_bytes.value;
            totalSpentMs += item.time_spent_ms.value;
          }
        }
        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( span.interval / 1000 ) ),
            total_hits: totalHits,
            total_received: totalReceived,
            total_sent: totalSent,
            total_spent_ms: totalSpentMs
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        return reply(boom.badImplementation('Failed to retrieve data from ES for query '  + JSON.stringify(request.query)));
      } );

  });
};

//  ---------------------------------
exports.getAggFlowReport = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      reportType = request.query.report_type || 'status_code';

    var field, keys;
    switch (reportType) {
      case 'status_code':
        field = 'requests.status_code';
        keys = {};
        break;
      case 'destination':
        field = 'requests.destination';
        keys = {
          'origin': 'Origin',
          'rev_edge': 'CDN'
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
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                        interval: ( '' + span.interval ),
                        min_doc_count: 0,
                        extended_bounds : {
                          min: span.start,
                          max: span.end - 1
                        },
                        offset: ( '' + ( span.end % span.interval ) )
                      },
                      aggs: {
                        //  "(un)swap incoming and outgoing bandwidth"
                        received_bytes: {
                          sum: {
                            // field: 'requests.received_bytes'
                            field: 'requests.sent_bytes'
                          }
                        },
                        sent_bytes: {
                          sum: {
                            // field: 'requests.sent_bytes'
                            field: 'requests.received_bytes'
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {

        var totalHits = 0;
        var totalSent = 0;
        var totalReceived = 0;
        var dataArray = [];

        if ( body.aggregations ) {
          var codes = body.aggregations.results.date_range.buckets[0].codes.buckets;
          for ( var ci = 0, clen = codes.length; ci < clen; ++ci ) {
            if ( reportType === 'status_code' && codes[ci].key === 0 ) {
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
            totalHits += data.hits;
            totalSent += data.received_bytes;
            totalReceived += data.sent_bytes;
          }
        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( span.interval / 1000 ) ),
            total_hits: totalHits,
            total_received: totalReceived,
            total_sent: totalSent
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

//  ---------------------------------
exports.getTopRequests = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 0,
      reportType = request.query.report_type || 'country';

    var field;
    switch (reportType) {
      case 'country':
        field = 'geoip.country_code2';
        break;
      case 'os':
        field = 'device.os';
        break;
      case 'device':
        field = 'device.model';
        // field = 'device.device';
        break;
      case 'operator':
        field = 'carrier.net_operator';
        break;
      case 'network':
        field = 'carrier.signal_type';
        break;
      default:
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      })
      .then(function(body) {

        var data = [];
        if ( body.aggregations ) {
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
            var item = body.aggregations.results.buckets[i];
            if ( reportType === 'operator' && item.key === '_' ) {
              item.key = 'No Cellular Connection';
            }
            data.push({
              key: item.key,
              count: ( ( item.hits && item.hits.hits && item.hits.hits.buckets.length && item.hits.hits.buckets[0].doc_count ) || 0 )
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopUsers = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 0,
      reportType = request.query.report_type || 'country';

    var field;
    switch (reportType) {
      case 'country':
        field = 'geoip.country_code2';
        break;
      case 'os':
        field = 'device.os';
        break;
      case 'device':
        // field = 'device.device';
        field = 'device.model';
        break;
      case 'operator':
        field = 'carrier.net_operator';
        break;
      case 'network':
        field = 'carrier.signal_type';
        break;
      default:
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then(function(body) {

        var data = [];
        if ( body.aggregations ) {
          for ( var i = 0, len = body.aggregations.results.buckets.length; i < len; ++i ) {
            var item = body.aggregations.results.buckets[i];
            if ( reportType === 'operator' && item.key === '_' ) {
              item.key = 'No Cellular Connection';
            }
            data.push({
              key: item.key,
              count: ( ( item.users && item.users.value ) || 0 )
            });
          }
        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopGBT = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 0,
      reportType = request.query.report_type || 'country';

    var field,
      subfield = false;
    switch (reportType) {
      case 'country':
        field = 'geoip.country_code2';
        subfield = 'geoip.region_name';
        break;
      case 'os':
        field = 'device.os';
        break;
      case 'device':
        // field = 'device.device';
        field = 'device.model';
        break;
      case 'operator':
        field = 'carrier.net_operator';
        break;
      case 'network':
        field = 'carrier.signal_type';
        break;
      default:
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var subaggs = {
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
                    // swapped intentionaly
                    field: 'requests.sent_bytes'
                  }
                },
                sent_bytes: {
                  sum: {
                    // swapped intentionaly
                    field: 'requests.received_bytes'
                  }
                }
              }
            }
          }
        }
      };

    if ( subfield ) {
      subaggs = {
        subresults: {
          terms: {
            field: subfield,
            size: 0
          },
          aggs: subaggs
        },
        missing_subfield: {
          missing: {
            field: subfield
          }
        }
      };
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
            size: count//,
            // order: {
            //   _count: 'desc'
            // }
          },
          aggs: subaggs
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then(function(body) {

        var data = [];
        /*
          "results": {
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": [
              {
                "key": "US",
                "doc_count": 4,
                "subresults": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "CA",
                      "doc_count": 4,
                      "deep": {
                        "doc_count": 200,
                        "hits": {
                          "buckets": [
                            {
                              "key": "2016-07-20T23:35:00.000Z-2016-07-21T23:34:59.999Z",
                              "from": 1469057700000,
                              "from_as_string": "2016-07-20T23:35:00.000Z",
                              "to": 1469144099999,
                              "to_as_string": "2016-07-21T23:34:59.999Z",
                              "doc_count": 200,
                              "received_bytes": {
                                "value": 25600
                              },
                              "sent_bytes": {
                                "value": 5080768
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
                },
                "missing_subfield": {
                  "doc_count": 0
                }
              }
            ]
          }
        */

        /*
          "results": {
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": [
              {
                "key": "9.2",
                "doc_count": 4,
                "deep": {
                  "doc_count": 200,
                  "hits": {
                    "buckets": [
                      {
                        "key": "2016-07-20T23:40:00.000Z-2016-07-21T23:39:59.999Z",
                        "from": 1469058000000,
                        "from_as_string": "2016-07-20T23:40:00.000Z",
                        "to": 1469144399999,
                        "to_as_string": "2016-07-21T23:39:59.999Z",
                        "doc_count": 200,
                        "received_bytes": {
                          "value": 25600
                        },
                        "sent_bytes": {
                          "value": 5080768
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        */


        if ( body.aggregations ) {

          data = body.aggregations.results.buckets.map( function( item ) {

            var res = {
              key: ( ( reportType === 'operator' && item.key === '_' ) ?
                'No Cellular Connection' : item.key ),
              count: 0,
              received_bytes: 0,
              sent_bytes: 0
            };

            if ( item.subresults ) {
              res.regions = item.subresults.buckets.map( function( r ) {
                var region = {
                  key: r.key,
                  count: 0,
                  received_bytes: 0,
                  sent_bytes: 0
                };
                if ( r.deep && r.deep.hits && r.deep.hits.buckets.length ) {
                  var deep = r.deep.hits.buckets[0];
                  region.count = deep.doc_count;
                  region.received_bytes = deep.received_bytes.value;
                  region.sent_bytes = deep.sent_bytes.value;
                }
                res.count += region.count;
                res.received_bytes += region.received_bytes;
                res.sent_bytes += region.sent_bytes;
                return region;
              });
            } else if ( item.deep && item.deep.hits && item.deep.hits.buckets.length ) {
              var deep = item.deep.hits.buckets[0];
              res.count = deep.doc_count;
              res.received_bytes = deep.received_bytes.value;
              res.sent_bytes = deep.sent_bytes.value;
            }

            return res;
          });

        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        console.log( error.toString() );
        console.log( error.stack );
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getDistributions = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 30,
      reportType = request.query.report_type || 'destination';

    var field, keys;
    switch (reportType) {
      case 'destination':
        field = 'requests.destination';
        keys = {
          'origin': 'Origin',
          'rev_edge': 'CDN'
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
          allow_any: true,
          '0': false  //  exception
        };
        break;
      default:
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
    if ( reportType !== 'status_code' ) {
      requestBody.aggs.result.aggs.result.aggs.distribution.aggs = {
        received_bytes: {
          sum: {
            //  "(un)swap incoming and outgoing bandwidth"
            // field: 'requests.received_bytes'
            field: 'requests.sent_bytes'
          }
        },
        sent_bytes: {
          sum: {
            // field: 'requests.sent_bytes'
            field: 'requests.received_bytes'
          }
        }
      };
    }

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then(function(body) {

        var data = [];
        if ( body.aggregations && body.aggregations.result.doc_count ) {
          for ( var i = 0, len = body.aggregations.result.result.buckets[0].distribution.buckets.length; i < len; ++i ) {
            var item = body.aggregations.result.result.buckets[0].distribution.buckets[i];
            if ( ( keys.allow_any && keys[item.key] !== false/*exception*/ ) || keys[item.key] ) {
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
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopObjects = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 30,
      reportType = request.query.report_type || 'any_request',
      term = false;

    switch (reportType) {
      case 'any_request':
        break;
      case 'cache_missed':
        term = { 'x-rev-cache': 'MISS' };
        break;
      case 'failed':
        term = { 'success_status': 0 };
        break;
      case 'not_found':
        term = { 'status_code': 404 };
        break;
      default:
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
              }
            }
          }
        }
      }
    };

    var sub = requestBody.aggs.result.aggs.result;
    if ( term ) {
      sub.aggs = {
          filtered: {
            filter: { term: term },
            aggs: {
              urls: {
                terms: {
                  field: 'requests.url',
                  size: count
                }
              }
            }
          }
        };
    } else {
      sub.aggs = {
          urls: {
            terms: {
              field: 'requests.url',
              size: count
            }
          }
        };
    }

    var terms = elasticSearch.buildESQueryTerms4SDK(request);
    sub = requestBody.query.filtered.filter.bool;
    sub.must = sub.must.concat( terms.must );
    sub.must_not = sub.must_not.concat( terms.must_not );

    var indicesList = utils.buildIndexList( span.start, span.end, 'sdkstats-' );
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then(function(body) {

        var data = [],
          total = 0,
          buckets = term ?
            ( ( body.aggregations && body.aggregations.result.result.buckets[0].filtered.urls.buckets ) || [] ) :
            ( ( body.aggregations && body.aggregations.result.result.buckets[0].urls.buckets ) || [] );

        for ( var i = 0, len = buckets.length; i < len; ++i ) {
          data.push({
            key: buckets[i].key,
            count: buckets[i].doc_count
          });
          total += buckets[i].doc_count;
        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopObjectsSlowest = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 30,
      reportType = request.query.report_type || 'full';

    var field;
    switch (reportType) {
      case 'full':
        field = 'requests.end_ts';
        break;
      case 'first_byte':
        field = 'requests.first_byte_ts';
        break;
      default:
        return reply(boom.badImplementation('Received bad reportType value ' + reportType));
    }

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then(function(body) {

        var data = [],
          total = 0,
          buckets = ( ( body.aggregations && body.aggregations.result.result.buckets[0].urls.buckets ) || [] );

        for ( var i = 0, len = buckets.length; i < len; ++i ) {
          data.push({
            key: buckets[i].key,
            count: buckets[i].doc_count,
            val: buckets[i].avg_time.value
          });
          total += buckets[i].doc_count;
        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });

  });
};

//  ---------------------------------
exports.getTopObjects5xx = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 1 /*def start in hrs*/ , 24/*allowed period in hrs*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      count = request.query.count || 30;

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                    ranges: [{ from: 500, to: 600 }]
                  },
                  aggs: {
                    codes: {
                      terms: {
                        field: 'requests.status_code',
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then(function(body) {

        var total = 0,
          codes = ( ( body.aggregations &&
            body.aggregations.result.result.buckets[0].codes.buckets[0].codes &&
            body.aggregations.result.result.buckets[0].codes.buckets[0].codes.buckets ) || [] ),  //  holy green cows ..
          data = codes.map( function( c ) {
            total += c.doc_count;
            return {
              key: c.key,
              count: c.doc_count,
              items: c.urls.buckets
            };
          });

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
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
        return reply(boom.badImplementation('Failed to retrieve data from ES, query: ' +
          JSON.stringify(requestBody) +
          ', indices: ' + indicesList +
          ', message: ' + error.toString()
          ) );
      });

  });
};

//  ---------------------------------
exports.getAB4FBTAverage = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '';

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                destinations: {
                  terms: { field: 'requests.destination' },
                  aggs: {
                    date_histogram: {
                      date_histogram: {
                        field: 'requests.start_ts',
                        interval: ( '' + span.interval ),
                        min_doc_count: 0,
                        extended_bounds : {
                          min: span.start,
                          max: span.end - 1
                        },
                        offset: ( '' + ( span.end % span.interval ) )
                      },
                      aggs: {
                        fbt_average: {
                          avg: {
                            field: 'requests.first_byte_ts'
                          }
                        },
                        fbt_min: {
                          min: {
                            field: 'requests.first_byte_ts'
                          }
                        },
                        fbt_max: {
                          max: {
                            field: 'requests.first_byte_ts'
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {

        var totalHits = 0;
        var dataArray = [];

        if ( body.aggregations ) {
          dataArray = body.aggregations.results.date_range.buckets[0].destinations.buckets.map( function( d ) {
            totalHits += d.doc_count;
            return {
              key: d.key,
              count: d.doc_count,
              items: d.date_histogram.buckets.map( function( item ) {
                return {
                  key_as_string: item.key_as_string,
                  key: item.key,
                  count: item.doc_count,
                  fbt_average: ( item.fbt_average.value ),
                  fbt_min: ( item.fbt_min.value ),
                  fbt_max: ( item.fbt_max.value )
                };
              })
            };
          });
        }
        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( span.interval / 1000 ) ),
            total_hits: totalHits
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

//  ---------------------------------
exports.getAB4FBTDistribution = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '',
      interval = request.query.interval_ms || 100,
      limit = request.query.limit_ms || 10000;

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                value_range: {
                  range: {
                    field: 'requests.first_byte_ts',
                    ranges: [{ from: 0, to: limit }]
                  },
                  aggs: {
                    destinations: {
                      terms: { field: 'requests.destination' },
                      aggs: {
                        histo: {
                          histogram: {
                            field: 'requests.first_byte_ts',
                            interval: ( '' + interval ),
                            min_doc_count: 0,
                            extended_bounds : { min : 0, max : limit - 1 }
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {

        var totalHits = 0;
        var dataArray = [];

        if ( body.aggregations &&
            body.aggregations.results.date_range.buckets[0].doc_count &&
            body.aggregations.results.date_range.buckets[0].value_range.buckets[0].doc_count ) {
          dataArray = body.aggregations.results.date_range.buckets[0].value_range.buckets[0].destinations.buckets.map( function( d ) {
            totalHits += d.doc_count;
            return {
              key: d.key,
              count: d.doc_count,
              items: d.histo.buckets.map( function( item ) {
                return {
                  key: item.key,
                  count: item.doc_count
                };
              })
            };
          });
        }

        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            total_hits: totalHits
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );


  });
};

//  ---------------------------------
exports.getAB4Errors = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '';

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                errors: {
                  filter: { term: { 'requests.success_status': 0 } },
                  aggs: {
                    destinations: {
                      terms: { field: 'requests.destination' },
                      aggs: {
                        date_histogram: {
                          date_histogram: {
                            field: 'requests.start_ts',
                            interval: ( '' + span.interval ),
                            min_doc_count: 0,
                            extended_bounds : {
                              min: span.start,
                              max: span.end - 1
                            },
                            offset: ( '' + ( span.end % span.interval ) )
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      } )
      .then( function( body ) {

        var totalHits = 0;
        var dataArray = [];

        if ( body.aggregations ) {
          dataArray = body.aggregations.results.date_range.buckets[0].errors.destinations.buckets.map( function( d ) {
            totalHits += d.doc_count;
            return {
              key: d.key,
              count: d.doc_count,
              items: d.date_histogram.buckets.map( function( item ) {
                return {
                  key_as_string: item.key_as_string,
                  key: item.key,
                  count: item.doc_count
                };
              })
            };
          });
        }
        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( span.interval / 1000 ) ),
            total_hits: totalHits
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

//  ---------------------------------
exports.getAB4Speed = function( request, reply ) {

  checkAppAccessPermissions_( request, reply, function() {

    var span = utils.query2Span( request.query, 24 /*def start in hrs*/ , 24 * 31 /*allowed period - month*/ );
    if ( span.error ) {
      return reply( boom.badRequest( span.error ) );
    }

    var accountID = request.query.account_id,
      appID = request.query.app_id || '';

    var requestBody = {
      size: 0,
      query: {
        filtered: {
          filter: {
            bool: {
              must: [ {
                term: ( appID ? { app_id: appID } : { account_id: accountID } )
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
                destinations: {
                  terms: { field: 'requests.destination' },
                  aggs: {
                    date_histogram: {
                      date_histogram: {
                        field: 'requests.start_ts',
                        interval: ( '' + span.interval ),
                        min_doc_count: 0,
                        extended_bounds : {
                          min: span.start,
                          max: span.end - 1
                        },
                        offset: ( '' + ( span.end % span.interval ) )
                      },
                      aggs: {
                        //  "(un)swap incoming and outgoing bandwidth"
                        received_bytes: {
                          sum: {
                            // field: 'requests.received_bytes'
                            field: 'requests.sent_bytes'
                          }
                        },
                        sent_bytes: {
                          sum: {
                            // field: 'requests.sent_bytes'
                            field: 'requests.received_bytes'
                          }
                        },
                        time_spent_ms: {
                          sum: {
                            field: 'requests.end_ts'
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
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      })
      .then( function( body ) {

        var totalHits = 0,
          totalSent = 0,
          totalReceived = 0,
          totalSpentMs = 0,
          dataArray = [];

        if ( body.aggregations ) {
          dataArray = body.aggregations.results.date_range.buckets[0].destinations.buckets.map( function( d ) {
            totalHits += d.doc_count;
            return {
              key: d.key,
              count: d.doc_count,
              items: d.date_histogram.buckets.map( function( item ) {

                totalReceived += item.received_bytes.value;
                totalSent += item.sent_bytes.value;
                totalSpentMs += item.time_spent_ms.value;
                return {
                  key_as_string: item.key_as_string,
                  key: item.key,
                  count: item.doc_count,
                  received_bytes: ( item.received_bytes.value ),
                  sent_bytes: ( item.sent_bytes.value ),
                  time_spent_ms: ( item.time_spent_ms.value )
                };

              })
            };
          });
        }


        var response = {
          metadata: {
            account_id: ( accountID || '*' ),
            app_id: ( appID || '*' ),
            start_timestamp: span.start,
            start_datetime: new Date( span.start ),
            end_timestamp: span.end,
            end_datetime: new Date( span.end ),
            interval_sec: ( Math.floor( span.interval / 1000 ) ),
            total_hits: totalHits,
            total_received: totalReceived,
            total_sent: totalSent,
            total_spent_ms: totalSpentMs
          },
          data: dataArray
        };
        renderJSON( request, reply, false, response );
      }, function( error ) {
        return reply( boom.badImplementation( 'Failed to retrieve data from ES' ) );
      } );

  });
};

