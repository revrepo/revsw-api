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
var _ = require('lodash');
var promise = require('bluebird');
var utils = require( '../lib/utilities.js' );
var renderJSON = require( '../lib/renderJSON' );
var elasticSearch = require( '../lib/elasticSearch' );
var reports = require( '../lib/usageReport' );

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
  store: 'memory',
  max: config.get('cache_memory_max_bytes'),
  ttl: config.get('cache_memory_ttl_seconds') /*seconds*/ ,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);

//  ----------------------------------------------------------------------------------------------//
/**
 * @name getAccountReport
 * @description Get Usage Report Date for an Account(s)
 */
exports.getAccountReport = function( request, reply ) {
  var queryProperties = _.clone(request.query);
  var isFromCache = true;
  var accountIds = utils.getAccountID(request);
  var accountID = utils.getAccountID(request, true);
  if(!!request.query && !!request.query.account_id) {
    accountID = request.query.account_id;
  }
  if(!!request.query && request.query.account_id === '') {
    // NOTE: if account_id exist but empty when accountID must be equal 'false' for get reports for all accounts
    accountID = false;
  }
  if(accountID !== false && (!accountIds.length || !utils.checkUserAccessPermissionToAccount(request, accountID))) {
    return reply(boom.badRequest('Account ID not found'));
  }
  var from = new Date(), to = new Date();// NOTE: default report period
  var from_ = request.query.from,
    to_ = request.query.to;

  if ( !!from_ ) {
    from = new Date(from_);
  }
  from.setUTCDate(1);             //  the very beginning of the month
  from.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
  if ( !!to_ ) {
    to = new Date(to_);
  }
  to.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
  var cacheKey = 'getAccountReport:' + accountID + ':' + JSON.stringify(queryProperties);
  multiCache.wrap(cacheKey, function() {
    isFromCache = false;
    return reports.checkLoadReports( from, to, accountID, request.query.only_overall, request.query.keep_samples )
      .then( function( response ) {
        var response_ = {
          metadata: {
            account_id: accountID,
            from: from.valueOf(),
            from_datetime: from,
            to: to.valueOf(),
            to_datetime: to,
            data_points_count: response.length
          },
          data: response
        };
        return response_;
      });
    })
    .then(function(response){
      if(isFromCache === true) {
        logger.info('getAccountStats:return cache for key - ' + cacheKey);
      }
      reply( response ).type( 'application/json; charset=utf-8' );
    })
    .catch( function( err ) {
      var msg = err.toString() + ': account ID ' + accountID +
        ', span from ' + (new Date(from)).toUTCString() +
        ', to ' + (new Date(to)).toUTCString();
      return reply( boom.badImplementation( msg ) );
    });
};

/**
 * @name getAccountStats
 * @description Get Usage Date Histogram for an Account(s)
 */
exports.getAccountStats = function( request, reply ) {
  var isFromCache = true;
  var accountIds = utils.getAccountID(request);
  var accountID = utils.getAccountID(request, true);
  if(!!request.query && !!request.query.account_id) {
    accountID = request.query.account_id;
  }
  if(!!request.query && request.query.account_id === '') {
    // NOTE: if account_id exist but empty when accountID must be equal 'false' for get reports for all accounts
    accountID = false;
  }
  if(accountID !== false && (!accountIds.length || !utils.checkUserAccessPermissionToAccount(request, accountID))) {
    return reply(boom.badRequest('Account ID not found'));
  }

  var span = utils.query2Span( request.query, 24/*def start in hrs*/, 24*61/*allowed period - 2 months*/ );
  if ( span.error ) {
    return reply(boom.badRequest( span.error ));
  }
  var cacheKey = 'getAccountStats:' + accountID + ':' + JSON.stringify(request.query);
  multiCache.wrap(cacheKey, function() {
      isFromCache = false;
      span.interval = 86400000; //  voluntarily set to full day
      return reports.checkLoadStats(span, accountID);
    })
    .then(function(response) {
      if (isFromCache === true) {
        logger.info('getAccountStats:return cache for key - ' + cacheKey);
      }
      reply(response).type('application/json; charset=utf-8');
    })
    .catch(function(err) {
      var msg = err.toString() + ': account ID ' + accountID +
        ', span from ' + (new Date(span.start)).toUTCString() +
        ', to ' + (new Date(span.end)).toUTCString();
      return reply(boom.badImplementation(msg));
    });
};
