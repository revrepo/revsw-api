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

var APIRoutesProvider = require('./../../providers/APIRoutesProvider');
var DASHBOARDS = require('./../../../../../config/routes/ids').DASHBOARDS;
var routeConfig = APIRoutesProvider.get(DASHBOARDS.BASE_PATH);
var Base = require('./base');

var DashboardsDataDrivenHelper = {

  payload: {

    genToAdd: function (type, callback) {
      Base.genPayload(type, routeConfig.getValidation(DASHBOARDS.POST.NEW), callback);
    },

    genToUpdate: function (type, callback) {
      Base.genPayload(type, routeConfig.getValidation(DASHBOARDS.PUT.ONE), callback);
    }
  }
};

module.exports = DashboardsDataDrivenHelper;
