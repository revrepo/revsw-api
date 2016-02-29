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

// # Activity Data Provider object

// Requiring some used resources
var Utils = require('./../../../common/utils');

var longStr = 'LoremipsumdolorsitametconsecteturadipiscingelitPellente' +
  'squeposuereturpisvelmolestiefeugiatmassaorcilacinianunceumolestiearc' +
  'umetusatestProinsitametnequeefficiturelementumquamutcondimentumanteQ' +
  'uisquesedipsumegetsemtempuseleifendinvelligulaNuncmaximusgravidalibe' +
  'roquisultriciesnuncgravidaeuCrasaeratsitametfeliseuismodplaceratViva' +
  'musfermentumduisitametsemaccumsansedvariusurnaaliquetIntegernonnunca' +
  'cmassaconsequatimperdietidinterdummagnaCurabiturdolorexsollicitudinv' +
  'iverranislegetsodalestempormagnaDuissitameturnaeratMaurisaccumsanleo' +
  'sedquamlobortisvenenatisNullamimperdietetmagnasedaccumsanDuisposuere' +
  'posuererisusvitaevolutpatVestibulumbibendumnislhendreritnisipharetra' +
  'infaucibusnullarhoncusPellentesquepretiumuttellusidpellentesqueAenea' +
  'nanteaugueultricesuttortorquisconsequatsemperfelis';
var longNumber = 1234567890123456789012345678901234567890123456789012345;
var bogusString = '!@#$%^&*()_+';
var emptyString = '';

// Defines some methods to generate valid and common domain-configs activity
// test data. With common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var ActivityDataProvider = {

  DataDrivenHelper: {

    getQueryParams: function () {
      var now = new Date();
      var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
      var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
      return [
        {}, // No query params
        //{user_id: 'US'},
        //{domain_id: 'Linux'},
        //{company_id: 'Something'},
        {from_timestamp: startTimestamp.toString()},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: endTimestamp.toString()
        }
      ];
    },

    getBogusQueryParams: function () {
      var now = new Date();
      var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
      return [
        //{user_id: 'US'},
        //{domain_id: 'Linux'},
        //{company_id: 'Something'},
        {from_timestamp: bogusString},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: bogusString
        }
      ];
    },

    /*

    /**
     * ### StatsDataProvider.DataDrivenHelper.getCombinedQueryParams()
     *
     * Returns all possible combinations for query params that STATS end-point
     * accepts.
     *
     * @returns {Array}, Array of Stats Query Params Object
     * /
    getCombinedQueryParams: function () {
      var combinations = [];
      var cacheCode = ['HIT', 'MISS'];
      var requestStatus = ['OK', 'ERROR'];
      var protocol = ['HTTP', 'HTTPS'];
      var httpMethod = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE',
        'OPTIONS', 'CONNECT', 'PATCH'];
      var quic = ['QUIC', 'HTTP'];

      for (var i = 0, lenCC = cacheCode.length; i < lenCC; i++) {
        for (var j = 0, lenRS = requestStatus.length; j < lenRS; j++) {
          for (var k = 0, lenP = protocol.length; k < lenP; k++) {
            for (var l = 0, lenHM = httpMethod.length; l < lenHM; l++) {
              for (var m = 0, lenQ = quic.length; m < lenQ; m++) {
                combinations.push({
                  cache_code: cacheCode[i],
                  request_status: requestStatus[j],
                  protocol: protocol[k],
                  http_method: httpMethod[l],
                  quic: quic[m]
                });
              }
            }
          }
        }
      }
      return combinations;
    },

    getCustomQueryParams: function (data) {
      return [
        {from_timestamp: data.stringVal},
        {to_timestamp: data.stringVal},
        {status_code: data.numberVal},
        {country: data.stringVal},
        {os: data.stringVal},
        {device: data.stringVal},
        {cache_code: data.stringVal},
        {request_status: data.stringVal},
        {protocol: data.stringVal},
        {http_method: data.stringVal},
        {quic: data.stringVal}
      ];
    },

    getLongQueryParams: function () {
      var params = this.getCustomQueryParams({
        numberVal: longNumber,
        stringVal: longStr
      });
      Utils.removeJsonFromArray(params, 'os');
      Utils.removeJsonFromArray(params, 'device');
      return params;
    },

    getBogusQueryParams: function () {
      var params = this.getCustomQueryParams({
        numberVal: bogusString,
        stringVal: bogusString
      });
      Utils.removeJsonFromArray(params, 'os');
      Utils.removeJsonFromArray(params, 'device');
      return params;
    },

    getEmptyQueryParams: function () {
      return this.getCustomQueryParams({
        numberVal: emptyString,
        stringVal: emptyString
      });
    },

    getInvalidQueryParams: function () {
      var params = this.getCustomQueryParams({
        numberVal: 'INVALID',
        stringVal: 'INVALID'
      });
      Utils.removeJsonFromArray(params, 'os');
      Utils.removeJsonFromArray(params, 'device');
      return params;
    }*/

    summary: {
      getQueryParams: function () {
        var now = new Date();
        var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
        var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
        return [
          {}, // No query params
          //{user_id: 'US'},
          //{domain_id: 'Linux'},
          //{company_id: 'Something'},
          {from_timestamp: startTimestamp.toString()},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: endTimestamp.toString()
          }
        ];
      },

      getBogusQueryParams: function () {
        var now = new Date();
        var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
        return [
          //{user_id: 'US'},
          //{domain_id: 'Linux'},
          //{company_id: 'Something'},
          {from_timestamp: bogusString},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: bogusString
          }
        ];
      },
    }
  }
};

module.exports = ActivityDataProvider;
