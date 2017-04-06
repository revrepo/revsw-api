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

var APITestError = require('./../apiTestError');

var RouteFileNameProvider = {

  get: function (routeId) {

    if (/::API_KEYS::/.test(routeId)) {
      return 'apiKeys';
    }

    if (/::DASHBOARDS::/.test(routeId)) {
      return 'dashboards';
    }

    throw new APITestError('Could not find route config file with the ' +
      'specified route ID: "' + routeId);
  }
};

module.exports = RouteFileNameProvider;
