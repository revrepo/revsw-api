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

var DNSZonesResource = require('./../resources/dnsZones');
var DNSZonesDP = require('./../providers/data/dnsZones');
var APITestError = require('./../apiTestError');

// # DNS Zones Helper
// Abstracts common functionality for the related resource.
var DNSZonesHelper = {

  /**
   * ### DNSZonesHelper.create()
   *
   * Creates a new DNS Zone using the account ID provided.
   *
   * @param {String} accountId
   */
  create: function (accountId) {
    var dnsZone = DNSZonesDP.generateOne(accountId);
    return DNSZonesResource
      .createOne(dnsZone)
      .then(function (res) {
        dnsZone.id = res.body.object_id;
        return dnsZone;
      })
      .catch(function (error) {
        throw new APITestError('Creating DNS Zone', error.response.body,
          dnsZone);
      });
  },


  /**
   * ### DNSZonesHelper.cleanup(namePattern)
   *
   * Cleans up all DNS Zones that matches with the give name pattern.
   *
   * @param {RegExp} namePattern, Regular expression for the DNS name to look
   * for and delete.
   */
  cleanup: function (namePattern) {
    return DNSZonesResource
      .getAll()
      .expect(200)
      .then(function (res) {
        var ids = [];
        var dnsZones = res.body;
        dnsZones.forEach(function (dnsZone) {
          if (namePattern.test(dnsZone.zone)) {
            ids.push(dnsZone.id);
          }
        });
        return DNSZonesResource
          .deleteManyIfExist(ids);
      });
  },

  records: {

    /**
     * ### DNSZonesHelper.records.create()
     *
     * Creates a new DNS Zone Record using the DNS Zone ID provided.
     *
     * @param {String} dnsZoneId
     */
    create: function (dnsZoneId) {
      var dnsZoneRecord = DNSZonesDP.generateOne(accountId);
      return DNSZonesResource
        .createOne(dnsZoneRecord)
        .then(function (res) {
          dnsZoneRecord.id = res.body.object_id;
          return dnsZoneRecord;
        })
        .catch(function (error) {
          throw new APITestError('Creating DNS Zone', error.response.body,
            dnsZoneRecord);
        });
    }
  }
};

module.exports  = DNSZonesHelper;
