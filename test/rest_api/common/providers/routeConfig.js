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
var RouteFileNameProvider = require('./routeFileName');

var RouteConfigProvider = (function () {

  var ROUTES_DIR = './schema/routes/config/';
  var routeConfig = {};

  return {

    get: function (routeId) {

      if (routeConfig[routeId] !== undefined) {
        return routeConfig[routeId];
      }

      var routes = require(ROUTES_DIR + RouteFileNameProvider.get(routeId));

      for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        if (route.config.id && route.config.id === routeId) {
          routeConfig[routeId] = route.config;
          return routeConfig[routeId];
        }
      }

      throw new APITestError('Could not find route config with the specified ' +
        'route ID: "' + routeId);
    }
  };
})();

module.exports = RouteConfigProvider;
