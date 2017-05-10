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
    };
  },

  /**
   * ### DNSZonesDataProvider.getRecordAt()
   *
   * Returns record data object from Record at specific position/index from a
   * DNS Zone object.
   *
   * @param {Object} dnsZone, DNS Zone object data
   * @param {Number} index, position of the required record
   * @returns {Object} DNS Zone Record object data
   */
  getRecordAt: function (dnsZone, index) {
    return dnsZone.records[index];
  },

  /**
   * ### DNSZonesDataProvider.getLastRecord()
   *
   * Returns record data object from last Record from a DNS Zone object.
   *
   * @param {Object} dnsZone, DNS Zone object data
   * @returns {Object} DNS Zone Record object data
   */
  getLastRecord: function (dnsZone) {
    return this.getRecordAt(dnsZone, dnsZone.records.length - 1);
  },

  records: {

    /**
     * ### DNSZonesDataProvider.records.generateOne()
     *
     * Generates valid data that represents a DNS Zone Record which the
     * dns_zones/records REST API end points accepts.
     *
     * @param {String} zone
     *
     * @returns {Object} DNS Zone Record data
     */
    generateOne: function (zone) {
      var subDomain = 'sub-domain-' + Date.now();
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

    /**
     * ### DNSZonesDataProvider.records.generateOneForUpdate()
     *
     * Generates valid data that represents a DNS Zone Record for update request.
     *
     * @param {Object} dnsZoneRecord data retrieved from API side
     *
     * @returns {Object} DNS Zone Record data for update action/request
     */
    generateOneForUpdate: function (dnsZoneRecord) {
      var clone = JSON.parse(JSON.stringify(dnsZoneRecord));
      clone.use_client_subnet = false;
      delete clone.id;
      delete clone.short_answers;
      return clone;
    }
  }
};

module.exports = DNSZonesDataProvider;
