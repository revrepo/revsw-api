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

var DashboardsResource = require('./../resources/dashboards');
var DashboardsDP = require('./../providers/data/dashboards');
var APITestError = require('./../apiTestError');

// # Dashboards Helper
// Abstracts common functionality for the related resource.
module.exports = {

  /**
   * Creates a new dashboard.
   *
   * @returns {Object} Promise, with the new dashboard object created
   */
  createOne: function () {
    var dashboard = DashboardsDP.generateOne();
    return DashboardsResource
      .createOne(dashboard)
      .then(function (res) {
        dashboard.id = res.body.object_id;
        return dashboard;
      })
      .catch(function (error) {
        throw new APITestError('Creating Dashboard', error.response.body,
          dashboard);
      });
  }
};