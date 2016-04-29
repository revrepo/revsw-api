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

// Defines some methods to generate valid and common domain-configs stats/sdk test data.
var StatsSDKDataProvider = {

  DataDrivenHelper: {

    timestamps_: function() {
      var now = Date.now();
      return [
        {from_timestamp: ( now - 21600000/*6*/ )},
        {from_timestamp: ( now - 21600000/*6*/ ),
          to_timestamp: ( now - 7200000/*2*/ )},
        {from_timestamp: ( now - 86400000/*24*/ )},
        {from_timestamp: ( now - 86400000/*24*/ ),
          to_timestamp: ( now - 43200000/*12*/ )}
      ];
    },

    getAppAccQueryParams: function () {
      return Utils.combineQueries(
        this.timestamps_(),
        [{report_type: 'devices'},{report_type: 'hits'}]
      );
    },

    getDirsQueryParams: function ( account_id, app_id ) {
      return Utils.combineQueries(
        this.timestamps_(),
        [{account_id: account_id},{app_id: app_id}]
      );
    },

    getFlowQueryParams: function ( account_id, app_id ) {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: account_id},{app_id: app_id}],
        [{device: 'Sony'},{device: 'Lenovo'}],
        [{country:'US'},{country:'CN'},{country:'GB'}],
        [{operator:'AOL'}],
        [{network:'WiFi'},{network:'Cellular'}]
      );
      Utils.shuffleArray( pars );
      pars.length = 30;
      return pars;
    },

    getAggFlowQueryParams: function ( account_id, app_id ) {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: account_id},{app_id: app_id}],
        [{device: 'Sony'},{device: 'Lenovo'}],
        [{country:'US'},{country:'GB'}],
        [{operator:'AOL'}],
        [{network:'WiFi'},{network:'Cellular'}],
        [{report_type:'status_code'},{report_type:'destination'},{report_type:'transport'},{report_type:'status'},{report_type:'cache'}]
      );
      Utils.shuffleArray( pars );
      pars.length = 60;
      return pars;
    },

    getTopsQueryParams: function ( account_id, app_id ) {
      return Utils.combineQueries(
        this.timestamps_(),
        [{account_id: account_id},{app_id: app_id}],
        [{report_type:'country'},{report_type:'os'},{report_type:'device'},{report_type:'operator'},{report_type: 'network'}]
      );
    },

  }
};

module.exports = StatsSDKDataProvider;
