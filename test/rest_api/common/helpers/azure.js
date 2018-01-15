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

var AzureResource = require('./../resources/azure');
var AzureDP = require('./../providers/data/azure');
var APITestError = require('./../apiTestError');

// # Azure Helper
// Abstracts common functionality for the related resource.
var AzureHelper = {

  /**
   * ### AzureHelper.createOne()
   *
   * Creates a new Azure Resource.
   *
   * @param {Object} data, azure resource data:
   */
  createOne: function (data) {
    var resource = AzureDP.generateOne(data);
    var location = AzureDP.generateLocation();
    return AzureResource
              .subscriptions()
              .resourceGroups(resource.subscription_id)
              .providers(resource.resource_group_name)
              .accounts(resource.provider)
              .update(resource.resource_name, location)
              .expect(200)
              .then(function (res) {
                res.original_object = resource;
                return res;
              })
              .catch(function (res) {
                res.original_object = resource;
                return res;
              });
  }
};

module.exports  = AzureHelper;