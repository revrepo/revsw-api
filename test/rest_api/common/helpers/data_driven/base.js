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

var generate = function (type, config, callback) {
  joiGen.generateAll(Joi.object(config), function (err, data) {
    var dataSet = data[type] || [];
    callback(err, dataSet);
  });
};

var BaseDataDrivenHelper = {

  genPayload: function (type, config, callback) {
    generate(type, config.payload, callback);
  },

  genQuery: function (type, config, callback) {
    generate(type, config.query, callback);
  },

  genParams: function (type, config, callback) {
    generate(type, config.params, callback);
  },

  genOptions: function (type, config, callback) {
    generate(type, config.options, callback);
  }
};

module.exports = BaseDataDrivenHelper;
