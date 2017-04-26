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

// # DNS Zone Data Provider object
//
// Defines some methods to generate valid and common DNS Zone test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var DNSZonesDataProvider = {

  prefix: 'API-ZONE',

  /**
   * ### DNSZonesDataProvider.generateOne()
   *
   * Generates valid data that represents a dns zone which the
   * dns_zones REST API end points accept.
   *
   * @param {String} accountId, which will be used in the log shipping job data.
   * @param {String} prefix, additional test-environment prefix (optional).
   *
   * @returns {Object} account info with the following schema
   *
   *     {
   *         account_id: string
   *         zone: string
   *     }
   */
  generateOne: function (accountId, prefix) {
    var _prefix = prefix || this.prefix;
    return {
      'zone': (_prefix + '-' + Date.now() + '.net').toLowerCase(),
      'account_id': accountId
    };
  },

  /**
   * ### DNSZonesDataProvider.generateOne()
   *
   * Generates valid DNS ZONE updated data that dns_zones REST API end
   * points accept.
   */
  generateToUpdate: function () {
    return {
      refresh: 0,
      retry: 0,
      expiry: 0,
      nx_ttl: 0,
      ttl: 0
    }
  },

  generateRecordOne: function (zone) {
    return {
      'type': 'A',
      'domain': 'domain-' + Date.now() + '.' + zone,
      'record': {
        'type': 'A',
        'domain': 'domain-' + Date.now() + '.' + zone,
        'ttl': 200,
        'answers': [
          {
            'answer': ['1.1.1.1']
          },
          {
            'answer': ['1.2.3.4']
          }
        ]
      }
    };
  },

  records: {
    generateOne: function (zone) {
      var subDomain = 'test';
      return {
        'type': 'NS',
        'domain': subDomain + '.' + zone,
        'record': {
          'type': 'NS',
          'zone':  zone,
          'domain': subDomain + '.' + zone,
          'answers': [
            {
              'answer': [
                'ns1.' + zone
              ]
            }
          ]
        }
      };
    },
  }
};

module.exports = DNSZonesDataProvider;
