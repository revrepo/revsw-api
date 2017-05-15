/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var BaseSP = require('./base');
var ROUTE_IDS = require('./routes/ids');

var DNSZonesSchemaProvider = {

  getForGetAll: function () {
    return BaseSP.get(ROUTE_IDS.DNS_ZONES.GET.ALL);
  },

  getForGetOne: function () {
    return BaseSP.get(ROUTE_IDS.DNS_ZONES.GET.ONE);
  },

  getForCreate: function () {
    return BaseSP.get(ROUTE_IDS.DNS_ZONES.POST.NEW);
  },

  getForUpdate: function () {
    return BaseSP.get(ROUTE_IDS.DNS_ZONES.PUT.ONE);
  },

  getForDelete: function () {
    return BaseSP.get(ROUTE_IDS.DNS_ZONES.DELETE.ONE);
  },

  records: {

    getForGetAll: function () {
      return BaseSP.get(ROUTE_IDS.DNS_ZONES.RECORDS.GET.ALL);
    },

    getForGetOne: function () {
      return BaseSP.get(ROUTE_IDS.DNS_ZONES.RECORDS.GET.ONE);
    },

    getForCreate: function () {
      return BaseSP.get(ROUTE_IDS.DNS_ZONES.RECORDS.POST.NEW);
    },

    getForUpdate: function () {
      return BaseSP.get(ROUTE_IDS.DNS_ZONES.RECORDS.PUT.ONE);
    },

    getForDelete: function () {
      return BaseSP.get(ROUTE_IDS.DNS_ZONES.RECORDS.DELETE.ONE);
    }
  }
};

module.exports = DNSZonesSchemaProvider;
