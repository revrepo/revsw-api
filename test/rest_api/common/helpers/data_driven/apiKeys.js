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
var API_KEYS = require('./../../../../../config/routes/ids').API_KEYS;
var routeConfig = APIRoutesProvider.get(API_KEYS.BASE_PATH);
var Base = require('./base');

var APIKeysDataDrivenHelper = {

  payload: {

    genToAdd: function (type, callback) {
      Base.genPayload(type, routeConfig.getValidation(API_KEYS.POST.NEW), callback);
    },

    genToUpdate: function (type, callback) {
      Base.genPayload(type, routeConfig.getValidation(API_KEYS.PUT.ONE), callback);
    }
  }
};

module.exports = APIKeysDataDrivenHelper;
