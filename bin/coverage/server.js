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

var express = require('express');
var coverage = require('istanbul-middleware');

module.exports = {
  start: function (port) {
    var coveragePath = '/';

    // Run HapiJS Server (for API).
    require('../revsw-api');

    // Run ExpressJS Server (for Coverage)
    var app = express();
    app.use(coveragePath, coverage.createHandler({
      verbose: true,
      resetOnGet: true
    }));
    app.listen(port);

    console.info('Coverage report at http://localhost:' + port + coveragePath);
  }
};
