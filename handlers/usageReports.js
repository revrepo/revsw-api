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

// var mongoose = require('mongoose');
// var mongoConnection = require('../lib/mongoConnections');
// var App = require('../models/App');
// var apps = new App(mongoose, mongoConnection.getConnectionPortal());


//  ---------------------------------
var checkAccountAccessPermissions_ = function( request, reply ) {

  var account_id = request.query.account_id || request.params.account_id || '';
  if ( !account_id ) {
    reply( boom.badRequest( 'Account ID should be provided' ) );
    return false;
  }

  var creds = request.auth.credentials;
  //  user is revadmin
  if ( creds.role === 'revadmin' || creds.companyId.indexOf( account_id ) !== -1 ) {
    return true;
  }

  reply(boom.badRequest( 'Account ID not found' ));
  return false;
};

//  ----------------------------------------------------------------------------------------------//

exports.getAccountReport = function( request, reply ) {

  if ( !checkAccountAccessPermissions_( request, reply ) ) {
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

  reports.loadReports( from, to, request.params.account_id, request.query.extended, request.query.bandwidth )
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
      logger.error( err );
      return reply( boom.badImplementation( err.toString() + ': account ID ' +
        request.params.account_id + ', span from ' + from.toUTCString() + ', to ' + to.toUTCString() ) );
    });

};


