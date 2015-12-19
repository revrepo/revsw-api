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

// # Stats Data Provider object

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

// Defines some methods to generate valid and common domain-configs stats test
// data. With common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var StatsDataProvider = {

  DataDrivenHelper: {

    getQueryParams: function () {
      var now = new Date();
      var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
      var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
      return [
        {from_timestamp: startTimestamp.toString()},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: endTimestamp.toString()
        },
        {status_code: 200},
        {country: 'US'},
        {os: 'Linux'},
        {device: 'Something'},
        {cache_code: 'HIT'},
        {cache_code: 'MISS'},
        {request_status: 'OK'},
        {request_status: 'ERROR'},
        {protocol: 'HTTP'},
        {protocol: 'HTTPS'},
        {http_method: 'GET'},
        {http_method: 'HEAD'},
        {http_method: 'POST'},
        {http_method: 'PUT'},
        {http_method: 'DELETE'},
        {http_method: 'TRACE'},
        {http_method: 'OPTIONS'},
        {http_method: 'CONNECT'},
        {http_method: 'PATCH'},
        {quic: 'QUIC'},
        {quic: 'HTTP'}
      ];
    },

    /**
     * ### StatsDataProvider.DataDrivenHelper.getCombinedQueryParams()
     *
     * Returns all possible combinations for query params that STATS end-point
     * accepts.
     *
     * @returns {Array}, Array of Stats Query Params Object
     */
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
    },

    gbt: {
      getQueryParams: function () {
        var now = new Date();
        var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
        var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
        return [
          {from_timestamp: startTimestamp.toString()},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: endTimestamp.toString()
          },
          {count: 10},
          {report_type: 'country'},
          {report_type: 'device'},
          {report_type: 'os'}
        ];
      },

      getCustomQueryParams: function (data) {
        return [
          {from_timestamp: data.stringVal},
          {to_timestamp: data.stringVal},
          {count: data.numberVal},
          {report_type: data.stringVal}
        ];
      },

      getLongQueryParams: function () {
        return this.getCustomQueryParams({
          numberVal: longNumber,
          stringVal: longStr
        });
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
      }
    },

    lastMileRtt: {
      getQueryParams: function () {
        var now = new Date();
        var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
        var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
        return [
          {from_timestamp: startTimestamp.toString()},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: endTimestamp.toString()
          },
          {count: 10},
          {report_type: 'country'},
          {report_type: 'device'},
          {report_type: 'os'}
        ];
      },

      getCustomQueryParams: function (data) {
        return [
          {from_timestamp: data.stringVal},
          {to_timestamp: data.stringVal},
          {count: data.numberVal},
          {report_type: data.stringVal}
        ];
      },

      getLongQueryParams: function () {
        return this.getCustomQueryParams({
          numberVal: longNumber,
          stringVal: longStr
        });
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
      }
    },

    top: {
      getQueryParams: function () {
        var now = new Date();
        var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
        var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
        return [
          {from_timestamp: startTimestamp.toString(), report_type: 'referer'},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: endTimestamp.toString(),
            report_type: 'referer'
          },
          {count: 10, report_type: 'referer'},
          {report_type: 'referer'},
          {report_type: 'status_code'},
          {report_type: 'cache_status'},
          {report_type: 'content_type'},
          {report_type: 'protocol'},
          {report_type: 'request_status'},
          {report_type: 'http_protocol'},
          {report_type: 'http_method'},
          {report_type: 'content_encoding'},
          {report_type: 'os'},
          {report_type: 'device'},
          {report_type: 'country'},
          {report_type: 'QUIC'},
          {report_type: 'http2'},
          {report_type: 'top5xx'},
          {country: 'US', report_type: 'referer'}
        ];
      },

      getCustomQueryParams: function (data) {
        return [
          {from_timestamp: data.stringVal, report_type: 'referer'},
          {to_timestamp: data.stringVal, report_type: 'referer'},
          {count: data.numberVal, report_type: 'referer'},
          {report_type: data.stringVal},
          {country: data.stringVal, report_type: 'referer'}
        ];
      },

      getLongQueryParams: function () {
        return this.getCustomQueryParams({
          numberVal: longNumber,
          stringVal: longStr
        });
      },

      getBogusQueryParams: function () {
        return this.getCustomQueryParams({
          numberVal: bogusString,
          stringVal: bogusString
        });
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
      }
    },

    topObjects: {
      getQueryParams: function () {
        var now = new Date();
        var startTimestamp = now.setHours(1, 0, 0, 0); // 1 AM
        var endTimestamp = now.setHours(2, 0, 0, 0); // 2 AM
        return [
          {from_timestamp: startTimestamp.toString()},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: endTimestamp.toString()
          },
          {count: 10},
          {status_code: 200},
          {cache_code: 'HIT'},
          {cache_code: 'MISS'},
          {request_status: 'OK'},
          {request_status: 'ERROR'},
          {protocol: 'HTTP'},
          {protocol: 'HTTPS'},
          {http_method: 'GET'},
          {http_method: 'HEAD'},
          {http_method: 'POST'},
          {http_method: 'PUT'},
          {http_method: 'DELETE'},
          {http_method: 'TRACE'},
          {http_method: 'OPTIONS'},
          {http_method: 'CONNECT'},
          {http_method: 'PATCH'},
          {quic: 'QUIC'},
          {quic: 'HTTP'},
          {http2: 'h2'},
          {http2: 'h2c'},
          {country: 'US'},
          {os: 'Linux'},
          {device: 'Something'}
        ];
      },

      getCombinedQueryParams: function () {
        var combinations = [];
        var cacheCode = ['HIT', 'MISS'];
        var requestStatus = ['OK', 'ERROR'];
        var protocol = ['HTTP', 'HTTPS'];
        var httpMethod = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE',
          'OPTIONS', 'CONNECT', 'PATCH'];
        var quic = ['QUIC', 'HTTP'];
        var http2 = ['h2', 'h2c'];

        for (var i = 0, lenCC = cacheCode.length; i < lenCC; i++) {
          for (var j = 0, lenRS = requestStatus.length; j < lenRS; j++) {
            for (var k = 0, lenP = protocol.length; k < lenP; k++) {
              for (var l = 0, lenHM = httpMethod.length; l < lenHM; l++) {
                for (var m = 0, lenQ = quic.length; m < lenQ; m++) {
                  for (var n = 0, lenH2 = http2.length; n < lenH2; n++) {
                    combinations.push({
                      cache_code: cacheCode[i],
                      request_status: requestStatus[j],
                      protocol: protocol[k],
                      http_method: httpMethod[l],
                      quic: quic[m],
                      http2: http2[n]
                    });
                  }
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
          {count: data.numberVal},
          {status_code: data.numberVal},
          {cache_code: data.stringVal},
          {request_status: data.stringVal},
          {protocol: data.stringVal},
          {http_method: data.stringVal},
          {quic: data.stringVal},
          {http2: data.stringVal},
          {country: data.stringVal},
          {os: data.stringVal},
          {device: data.stringVal}
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
      }
    }
  }
};

module.exports = StatsDataProvider;