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

var BaseDDP = require('./base');
var SchemaDP = require('./../../providers/schema');
var API_KEYS = require('./../../../common/constants').API.ROUTES.API_KEYS;

var APIKeysDataDrivenHelper = {

  payload: {

    genToAdd: function (type, callback) {
      BaseDDP
        .genPayload(type, SchemaDP.get(API_KEYS.POST.NEW).request, callback);
    },

    genToUpdate: function (type, callback) {
      BaseDDP
        .genPayload(type, SchemaDP.get(API_KEYS.PUT.ONE).request, callback);
    }
  }
};

module.exports = APIKeysDataDrivenHelper;
