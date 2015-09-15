/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

/*jslint node: true */

'use strict';

var utils = require('../lib/utilities.js');

// render json out to http stream
function renderJSON(request, reply, error, result) {
  if (error) {
    if (utils.isString(error)) {
      reply(utils.buildError(400, error));
    } else {
      reply(error);
    }
  } else {
    reply(result).type('application/json; charset=utf-8');
  }
}

exports.renderJSON = function () {
  return renderJSON;
};
