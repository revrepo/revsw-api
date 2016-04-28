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

// # StatsSDK Data Provider object

// Requiring some used resources
var Utils = require('./../../../common/utils');

var assg = Utils.assign;
var now = Date.now();
var from_2 = {from_timestamp: ( now - 7200000/*2hrs in ms*/ )};
var from_6 = {from_timestamp: ( now - 21600000/*6hrs in ms*/ )};
var from_24 = {from_timestamp: ( now - 86400000/*day in ms*/ )};
var to_now = {to_timestamp: now};
var to_12 = {to_timestamp: ( now - 43200000/*half day in ms*/ )};

// Defines some methods to generate valid and common domain-configs stats/sdk test data.
var StatsSDKDataProvider = {

  DataDrivenHelper: {

    getAppAccQueryParams: function () {

      return [
        {},
        assg({}, from_2 ),
        assg({}, from_24 ),
        assg({}, from_24, to_12 ),
        {report_type: 'hits'},
        assg({report_type: 'hits'}, to_now),
        {report_type: 'devices'}
      ];
    },

    getDirsQueryParams: function ( account_id, app_id ) {

      return [
        {account_id: account_id},
        assg({account_id: account_id}, from_2),
        assg({account_id: account_id}, from_24, to_12 ),
        assg({account_id: account_id}, to_now ),
        {app_id: app_id},
        assg({app_id: app_id}, from_2),
        assg({app_id: app_id}, from_24, to_12 ),
        assg({app_id: app_id}, to_now )
      ];
    },

    getFlowQueryParams: function ( account_id, app_id ) {
      return [
        {account_id: account_id},
        assg({account_id: account_id}, from_2),
        assg({account_id: account_id}, from_24, to_12 ),
        assg({account_id: account_id}, to_now ),
        assg({account_id: account_id, device: 'Sony', os: 'Android'}, from_2),
        assg({account_id: account_id, country: 'US', operator: 'AOL'}, from_2),
        assg({account_id: account_id, os: 'Android', country: 'US'}, from_6),
        assg({account_id: account_id, operator: 'AOL', network: 'WiFi'}, from_6),
        {app_id: app_id},
        assg({app_id: app_id}, from_2),
        assg({app_id: app_id}, from_24, to_12 ),
        assg({app_id: app_id}, to_now ),
        assg({app_id: app_id, device: 'Sony', os: 'Android'}, from_2),
        assg({app_id: app_id, country: 'US', operator: 'AOL'}, from_2),
        assg({app_id: app_id, os: 'Android', country: 'US'}, from_6),
        assg({app_id: app_id, operator: 'AOL', network: 'WiFi'}, from_6),
      ];
    },

    getAggFlowQueryParams: function ( account_id, app_id ) {
      var pars = this.getFlowQueryParams( account_id, app_id );
      var report_types = ['status_code', 'destination', 'transport', 'status', 'cache'];
      pars.forEach( function( par, idx ) {
        par.report_type = report_types[idx % 5];
      });
      return pars;
    },

    getTopsQueryParams: function ( account_id, app_id ) {
      report_type = ['country', 'os', 'device', 'operator', 'network']
      return [
        {account_id: account_id, report_type: 'device'},
        assg({account_id: account_id, report_type: 'country'}, from_2),
        assg({account_id: account_id, report_type: 'os'}, from_24, to_12 ),
        assg({account_id: account_id, report_type: 'device'}, to_now ),
        assg({account_id: account_id, report_type: 'operator'}, from_2),
        assg({account_id: account_id, report_type: 'network'}, from_2),
        assg({account_id: account_id, report_type: 'operator'}, from_6),
        assg({account_id: account_id, report_type: 'network'}, from_6),
        {app_id: app_id, report_type: 'device'},
        assg({app_id: app_id, report_type: 'country'}, from_2),
        assg({app_id: app_id, report_type: 'os'}, from_24, to_12 ),
        assg({app_id: app_id, report_type: 'device'}, to_now ),
        assg({app_id: app_id, report_type: 'operator'}, from_2),
        assg({app_id: app_id, report_type: 'network'}, from_2),
        assg({app_id: app_id, report_type: 'operator'}, from_6),
        assg({app_id: app_id, report_type: 'network'}, from_6),
      ];
    },

    getCombinedQueryParams__: function () {
      ['Samsung', 'Sony', 'Lenovo'].forEach( function( device ) {
        ['Android','iOS'].forEach( function( os ) {
          ['US', 'UK', 'CN', 'FR'].forEach( function( country ) {
            ['AOL', 'United Assholes'].forEach( function( operator ) {
              ['Cellular', 'WiFi'].forEach( function( network ) {
                combinations.push({
                  device: device,
                  os: os,
                  country: country,
                  operator: operator,
                  network: network
                });
              });
            });
          });
        });
      });
      return combinations;
    }

  }
};

module.exports = StatsSDKDataProvider;
