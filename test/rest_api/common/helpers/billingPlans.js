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

var BillingPlansResource = require('./../resources/billingPlans');
var APITestError = require('./../apiTestError');
var BillingPlansDP = require('./../providers/data/billingPlans');

// # Billing Plans Helper
// Abstracts common functionality for the related resource.
module.exports = {

  /**
   * Gets random billing plan object
   *
   * @returns {Promise}
   */
  getRandomOne: function () {
    return BillingPlansResource
      .getAll()
      .then(function (res) {
        var billingPlans = res.body;
        var randomIndex = parseInt(Math.random() * billingPlans.length);
        return billingPlans[randomIndex];
      })
      .catch(function (error) {
        throw new APITestError('Getting billing plans', error.response.body);
      });
  },

  /**
   * Creates a new Billing Plan.
   *
   * @returns {Object} Promise, with the new dashboard object created
   */
  createOne: function () {
    var dashboard = BillingPlansDP.generateOne();
    return BillingPlansResource
      .createOne(dashboard)
      .catch(function (error) {
        throw new APITestError('Creating Dashboard', error.response.body,
          dashboard);
      })
      .then(function (res) {
        dashboard.id = res.body.object_id;
        return dashboard;
      });
  }
};