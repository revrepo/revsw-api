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
//
// Defines some methods to generate valid and common domain-configs stats test
// data. With common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var StatsDataProvider = {

  DataDrivenHelper: {

    /**
     * ### StatsDataProvider.DataDrivenHelper.getCombinedQueryParams()
     *
     * Returns all possible combinations for query params that STATS end-point
     * accepts.
     *
     * @returns [ {Stats Query Params Object} ]
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

    getQueryParams: function () {
      return [
        // {from_timestamp: ''},
        // {to_timestamp: ''},
        // {status_code: 200},
        // {country: ''},
        // {os: ''},
        // {device: ''},

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
    }
  }
};

module.exports = StatsDataProvider;