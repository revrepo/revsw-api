/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

var _ = require('lodash');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var utils = require( '../lib/utilities.js' );
var es = require( '../lib/elasticSearch' );
var mail = require('../lib/mail');

var mongoConnection = require('../lib/mongoConnections');

var DomainConfig = require('../models/DomainConfig');
var domainsModel = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

//  ----------------------------------------------------------------------------------------------//

var dayRegEx_ = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
var parseDay_ = function( day ) {

  day = day || new Date();
  if ( _.isDate( day ) ) {
    day.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
    return day;
  }
  if ( dayRegEx_.test( day ) ) {
    return new Date( day );
  }
  var parsed = Date.parse( day );
  if ( !parsed ) {
    throw new Error( 'orphanedReport parsing error: wrong date format - ' + day );
  }
  parsed.setUTCHours( 0, 0, 0, 0 ); //  the very beginning of the day
  return parsed;
};

/** *********************************
 *  query domains list from the ES cluster
 *
 *  @param {Date}
 *  @returns {promise(array[string])}
 */
var collectDomainsFromLog_ = function( day ) {

  var start = day.getTime();
  start -= start % 86400000/*day_ms*/;
  var end = start + 86400000/*day_ms*/;

  var requestBody = {
    size: 0,
    query: { filtered: { filter: { bool: {
      must: [{
        range: {
          '@timestamp': {
            gte: start,
            lt: end
          }
        }
      }]
    } } } },
    aggs: {
      domains: {
        terms: { field: 'domain' }
      }
    }
  };

  return es.getClient().search( {
      index: utils.buildIndexList( start, end ),
      ignoreUnavailable: true,
      timeout: 120000,
      body: requestBody
    })
    .then( function( resp ) {
      return resp.aggregations.domains.buckets.map( function( item ) {
        return item.key;
      });
    });
};

/** *********************************
 *  query active domains list from the DB, including aliases
 *
 *  @returns {promise({domains: array[string], whildcard_aliases:[string])}
 */
var collectDomains_ = function() {

  return domainsModel.queryP({
      deleted: { $ne:true }
    },{
      _id:0,
      domain_name:1,
      'proxy_config.domain_aliases':1,
      'proxy_config.domain_wildcard_alias':1
    })
    .then( function( data ) {
      var domains = {};
      var wildcards = [];
      data.forEach( function( d ) {
        domains[d.domain_name] = 1;
        if ( !d.proxy_config ) {
          return;
        }
        if ( d.proxy_config.domain_aliases && d.proxy_config.domain_aliases.length ) {
          d.proxy_config.domain_aliases.forEach( function( item ) {
            domains[item] = 1;
          });
        }
        if ( d.proxy_config.domain_wildcard_alias ) {
          if ( d.proxy_config.domain_wildcard_alias.constructor === Array ) {
            wildcards = wildcards.concat( d.proxy_config.domain_wildcard_alias );
          } else {
            wildcards.push( d.proxy_config.domain_wildcard_alias );
          }
        }
      });

      return {
        domains: domains,
        wildcards: wildcards
      };
    });
};


//  ----------------------------------------------------------------------------------------------//
module.exports = {};

/** *********************************
 *  collect the orphaned domains list
 *
 *  @param {Date} - day of report, optional, default today
 *  @returns {promise(array[string])}
 */
module.exports.collectDayReport = function( day ) {

  logger.info( 'lib/orphansReport.js:collectDayReport starting.' );

  return promise.resolve( day )
    .then( parseDay_ )
    .then( function( day ) {
      logger.info( 'lib/orphansReport.js:collectDayReport day: ' + day.toISOString() );
      return promise.all([
        collectDomainsFromLog_( day ),
        collectDomains_()
      ]);
    })
    .then( function( results ) {
      var es_domains = results[0],
        domains = results[1].domains,
        wildcards = results[1].wildcards.map( function( item ) {
          return new RegExp( item.replace( /\./g, '\\.' ).replace( /\*/g, '.*' ) );
        }),
        orphans = [];

      es_domains.forEach( function( item ) {
        if ( domains[item] ) {
          return;
        }
        for ( var i = 0, len = wildcards.length; i < len; ++i ) {
          if ( wildcards[i].test( item ) ) {
            return;
          }
        }
        orphans.push( item );
      });

      // results.push( orphans );
      // results[1].wildcards = wildcards;
      // return results;
      if ( orphans.length ) {
        logger.warn( 'lib/orphansReport.js:collectDayReport found orphaned domains: [' + orphans.join(',') + '].' );
      } else {
        logger.info( 'lib/orphansReport.js:collectDayReport finished.' );
      }
      return orphans;
    })
    .catch( function( err ) {
      logger.error( 'lib/orphansReport.js:collectDayReport error: ' + err.toString() );
      logger.error( err.stack );
      throw err;
    });
};

/** *********************************
 *  send email with the orphaned domains list
 *  if [report_about_unknown_domains] config key is not set - it does nothing
 *
 *  @returns {promise()}
 */
module.exports.mailOrphans = function( orphans ) {

  if ( !config.report_about_unknown_domains ) {
    logger.warn( 'lib/orphansReport.js:mailOrphans, config parameter report_about_unknown_domains is not set.' );
    return promise.resolve( false );
  }

  //  TODO: edit email body
  var mailOptions = {
    to: config.report_about_unknown_domains,
    subject: 'Orphaned Domains Daily Report',
    text: 'Hi buddy,\n\n' +
      'We\'re in a deep shit. Here the list of today\'s orphaned domains: \n\n    [' +
      orphans.join('],\n    [') + ']\n\n' +
      'Have a nice day,\nRevAPM Report Bot\n'
  };

  return mail.sendMail( mailOptions )
    .catch( function( err ) {
      logger.error( 'lib/orphansReport.js:mailOrphans error: ' + err.toString() );
      logger.error( err.stack );
      throw err;
    });
};

