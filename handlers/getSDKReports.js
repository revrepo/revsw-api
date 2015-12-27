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
    }
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
    }
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

