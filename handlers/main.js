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
var pack  = require('../package');

exports.index = function (request, reply) {
  utils.getMarkDownHTML(__dirname.replace('/lib', '') + '/docs/revsw-api.txt', function (err, data) {
    reply.view('swagger.html', {
      title    : pack.name + ' &#151; Calculator',
      markdown : data
    });
  });
};

exports.reduced = function (request, reply) {
  utils.getMarkDownHTML(__dirname.replace('/lib', '') + '/docs/revsw-api.txt', function (err, data) {
    reply.view('reduced.html', {
      title    : pack.name + ' &#151; Calculator',
      markdown : data
    });
  });
};

exports.license = function (request, reply) {
  reply.view('license.html', {});
};
