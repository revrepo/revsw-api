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

var BaseDDP = require('./base');
var SchemaDP = require('./../../providers/schema/api');

var DNSZonesDataDrivenHelper = {

  payload: {

    genToAdd: function (type, callback) {
      BaseDDP
        .genPayload(type, SchemaDP.dnsZones.getForCreate().request, callback);
    },

    genToUpdate: function (type, callback) {
      BaseDDP
        .genPayload(type, SchemaDP.dnsZones.getForUpdate().request, callback);
    }
  },

  records: {

    payload: {

      genToAdd: function (type, callback) {
        BaseDDP
          .genPayload(
            type,
            SchemaDP.dnsZones.records.getForCreate().request,
            callback
          );
      },

      genToUpdate: function (type, callback) {
        BaseDDP
          .genPayload(type,
            SchemaDP.dnsZones.records.getForUpdate().request,
            callback
          );
      }
    }
  }
};

module.exports = DNSZonesDataDrivenHelper;