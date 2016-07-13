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
var reports = require( '../lib/usageReport' );

var config = require('config');
var logger = require('revsw-logger')(config.log_config);


//  ---------------------------------

// TODO: need to move the function to "utils" module
var checkAccountAccessPermissions_ = function( request ) {

  var accountID = request.query.account_id || '';
  var creds = request.auth.credentials;

  if ( creds.role === 'revadmin' ) {
    return accountID;
  }

  if ( !accountID ) {
    accountID = creds.companyId;
    if ( accountID.length === 0 ) {
      return false;
    }
    if ( accountID.length === 1 ) {
      accountID = accountID[0];
    }
    return accountID;
  }

  if (utils.getAccountID(request).indexOf( accountID ) !== -1) {
    return accountID;
  }

  return false;
};

//  ----------------------------------------------------------------------------------------------//

exports.getAccountReport = function( request, reply ) {

  var accountID = checkAccountAccessPermissions_( request );
  if ( accountID === false/*strict identity*/ ) {
    reply(boom.badRequest( 'Account ID not found' ));
    return false;
  }

  var from = request.query.from,
    to = request.query.to;

  if ( !from ) {
    from = new Date();
    from.setUTCDate(1);             //  the very beginning of the month
    from.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
  }

  if ( !to ) {
    to = new Date();
    to.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
  }

  reports.checkLoadReports( from, to, accountID, request.query.only_overall, request.query.keep_samples )
    .then( function( response ) {

      response = {
        metadata: {
          account_id: request.params.account_id,
          from: from,
          from_datetime: new Date(from),
          to: to,
          to_datetime: new Date(to),
          data_points_count: response.length
        },
        data: response
      };

      reply( response ).type( 'application/json; charset=utf-8' );
    })
    .catch( function( err ) {
      var msg = err.toString() + ': account ID ' + request.params.account_id +
        ', span from ' + (new Date(from)).toUTCString() +
        ', to ' + (new Date(to)).toUTCString();
      logger.error( 'getAccountReport error: ' + msg );
      return reply( boom.badImplementation( msg ) );
    });
};

//  ---------------------------------
exports.getAccountStats = function( request, reply ) {

  var accountID = checkAccountAccessPermissions_( request );
  if ( accountID === false/*strict identity*/ ) {
    reply(boom.badRequest( 'Account ID not found' ));
    return false;
  }

  var span = utils.query2Span( request.query, 24/*def start in hrs*/, 24*61/*allowed period - 2 months*/ );
  if ( span.error ) {
    return reply(boom.badRequest( span.error ));
  }

  span.interval = 86400000; //  voluntarily set to full day
  reports.checkLoadStats( span, accountID )
    .then( function( response ) {
      reply( response ).type( 'application/json; charset=utf-8' );
    })
    .catch( function( err ) {
      var msg = err.toString() + ': account ID ' + request.params.account_id +
        ', span from ' + (new Date(span.start)).toUTCString() +
        ', to ' + (new Date(span.end)).toUTCString();
      logger.error( 'getAccountReport error: ' + msg );
      return reply( boom.badImplementation( msg ) );
    });
};
