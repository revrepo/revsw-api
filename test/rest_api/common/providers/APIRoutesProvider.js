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

var ROUTES_DIR = './../../../../routes/';
var ROUTES_IDS = require('./../../../../config/routes/ids.json');

var APIRoutesProvider = {

  /**
   * Returns the config object for the specified route/resoruce
   *
   * @param name, of the route/resrouce
   *
   * @returns {Object}, route config info object
   */
  get: function (name) {

    var routes = {};
    routes[ROUTES_IDS.API_KEYS.BASE_PATH] = 'apiKeys';

    // Importing route config from API project.
    var routes = require(ROUTES_DIR + routes[name]);

    return {

      /**
       * Retrieves the validation configuration for the specified method/path
       * from the current route/resource
       *
       * @param {String} routeId, ID of the route
       * @returns {Object} validation configuration
       */
      getValidation: function (routeId) {
        for (var i = 0; i < routes.length; i++) {
          var route = routes[i];
          if (route.config.id && route.config.id === routeId) {
            return route.config.validate;
          }
        }
        throw new APITestError('Cannot find route config for the specified ' +
          'data "' + method + ': ' + path + '"');
      }
    }
  },

  getIds: function () {
    return require(ROUTES_DIR + 'ids.json');
  }
};

module.exports = APIRoutesProvider;
