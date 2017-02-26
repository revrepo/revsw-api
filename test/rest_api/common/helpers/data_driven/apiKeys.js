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

var Joi = require('joi');
var joiGen = new require('joi-generate').Generator();

var APIRoutesProvider = require('./../../providers/APIRoutesProvider');
var ROUTE_IDS = require('./../../../../../config/routes/ids');
var routeConfig = APIRoutesProvider.get(ROUTE_IDS.API_KEYS.BASE_PATH);

var APIKeysDataDrivenHelper = {

  generateToAdd: function (type, callback) {
    var validation = routeConfig.getValidation(ROUTE_IDS.API_KEYS.POST.NEW);
    joiGen.generateAll(Joi.object(validation.payload), function (err, data) {
      var dataSet = data[type] || [];
      callback(err, dataSet);
    });
  },

  generateToUpdate: function (type, callback) {
    var validation = routeConfig.getValidation(ROUTE_IDS.API_KEYS.PUT.ONE);
    joiGen.generateAll(Joi.object(validation.payload), function (err, data) {
      var dataSet = data[type] || [];
      callback(err, dataSet);
    });
  }
};

module.exports = APIKeysDataDrivenHelper;
