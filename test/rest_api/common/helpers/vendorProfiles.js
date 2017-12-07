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

var APITestError = require('./../apiTestError');
var VendorResource = require('./../resources/vendorProfiles');

// # Vendor Profiles Helper
// Abstracts common functionality for the related resource.
var VendorsHelpers = {
  /*
  * vendors.getAllVendors()
  *
  * Gets all the vendors list from the API
  */
  getAllVendors: function () {
    return VendorResource
      .getAll()
      .expect(200)
      .then(function (res) {
        return res.body;
      });
  },
  /*
  * vendors.getVendorByName()
  *
  * Gets a vendor by name
  * 
  */
  getVendorByName: function (name) {
    return VendorResource
      .vendorProfile()
      .getOne(name)
      .expect(200)
      .then(function (res) {
        return res.body;
      })
      .catch(function (err) {
        throw new Error(err);
      });
  },
  /*
  * vendors.updateVendorProfile()
  *
  * Sets a user's vendor to the vendor specified
  * 
  */
  updateVendorProfile: function (accountId, vendor) {
   return VendorResource
    .update(accountId, {
      vendor_profile: vendor
    })
    .expect(200)
    .then(function (res) {
      return res.body;
    })
    .catch(function (err) {
      throw new Error(err);
    });
  }
};

module.exports = VendorsHelpers;