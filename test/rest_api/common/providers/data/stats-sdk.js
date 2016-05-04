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

// Defines some methods to generate valid and common domain-configs stats/sdk test data.
var StatsSDKDataProvider = {

  DataDrivenHelper: {

    timestamps_: function() {
      var now = Date.now();
      return [
        {/*default timestamps*/},
        {from_timestamp: ( now - 21600000/*6*/ )},
        {from_timestamp: ( now - 21600000/*6*/ ), to_timestamp: ( now - 7200000/*2*/ )},
        {from_timestamp: ( now - 86000000/*little less than 24 hrs*/ )},
        {from_timestamp: ( now - 86400000/*24*/ ), to_timestamp: ( now - 43200000/*12*/ )}
      ];
    },

    getAppAccQueryParams: function () {
      return Utils.combineQueries(
        this.timestamps_(),
        [{report_type: 'devices'},{report_type: 'hits'}]
      );
    },

    getDirsQueryParams: function () {
      return Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}]
      );
    },

    getFlowQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{device: 'Sony'},{}],
        [{country:'US'},{}],
        [{operator:'AOL'}],
        [{network:'WiFi'},{}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 50;
      return pars;
    },

    getAggFlowQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{device: 'Sony'}],
        [{country:'US'},{}],
        [{operator:'AOL'}],
        [{network:'WiFi'}],
        [{report_type:'status_code'},{report_type:'destination'},{report_type:'transport'},{report_type:'status'},{report_type:'cache'}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 100;
      return pars;
    },

    getTopsQueryParams: function () {
      return Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{report_type:'country'},{report_type:'os'},{report_type:'device'},{report_type:'operator'},{report_type: 'network'}]
      );
    },

    getDistributionsQueryParams: function () {
      return Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{count: 10},{count: 50},{}],
        [{report_type:'destination'},{report_type:'transport'},{report_type:'status'},{report_type:'cache'},{report_type: 'domain'},{report_type: 'status_code'}]
      );
    },

    getTopObjectsQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{count:41},{}],
        [{os:'Android'}],
        [{device:'Sony'}],
        [{country:'US'}],
        [{operator:'AOL'}],
        [{network:'WiFi'},{}],
        [{report_type:'failed'},{report_type:'cache_missed'},{report_type:'not_found'}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 100;
      return pars;
    },

    getTopObjectsSlowestQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{count:29},{}],
        [{os:'Android'}],
        [{device:'Sony'}],
        [{country:'US'}],
        [{operator:'AOL'}],
        [{network:'WiFi'},{}],
        [{report_type:'full'},{report_type:'first_byte'}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 100;
      return pars;
    },

    getTopObjects5xxQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{count:13},{}],
        [{os:'Android'}],
        [{device:'Sony'}],
        [{country:'US'},{}],
        [{operator:'AOL'}],
        [{network:'WiFi'},{}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 100;
      return pars;
    },

    getABQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{os:'Android'},{}],
        [{device:'Lenovo'},{}],
        [{country:'GB'},{}],
        [{operator:'AOL'}],
        [{network:'WiFi'}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 100;
      return pars;
    },

    getABFBTDistributionQueryParams: function () {
      var pars = Utils.combineQueries(
        this.timestamps_(),
        [{account_id: true},{app_id: true}],
        [{interval_ms:200}],
        [{limit_ms:8000},{}],
        [{os:'Android'}],
        [{device:'Lenovo'}],
        [{country:'US'}],
        [{operator:'AOL'},{}],
        [{network:'Cellular'},{}]
      );
      // Utils.shuffleArray( pars );
      // pars.length = 100;
      return pars;
    },


  }
};

module.exports = StatsSDKDataProvider;
