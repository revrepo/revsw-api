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

var PurgeResource = require('./../resources/purge');
var PurgeDP = require('./../providers/data/purge');
var APITestError = require('./../apiTestError');

// # Purge Helper
// Abstracts common functionality for the related resource.
module.exports = {

  createOne: function (domainName) {
    var purgeData = PurgeDP.generateOne(domainName);
    return PurgeResource
      .createOne(purgeData)
      .catch(function (error) {
        throw new APITestError('Creating Purge Request' , error.response.body,
          purgeData);
      })
      .then(function (res) {
        purgeData.id = res.body.request_id;
        return purgeData;
      });
  }
};